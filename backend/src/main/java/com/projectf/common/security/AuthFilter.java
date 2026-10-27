package com.projectf.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.common.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.dao.DataAccessException;
import com.projectf.features.member.repository.ClubMemberRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthFilter extends OncePerRequestFilter {
    private final String supabaseUrl;
    private final String publishableKey;
    private final ClubMemberRepository members;
    private final ObjectMapper mapper;
    private final RestClient http = RestClient.create();

    public AuthFilter(@Value("${supabase.url:}") final String supabaseUrl,
            @Value("${supabase.publishable-key:}") final String publishableKey,
            final ClubMemberRepository members, final ObjectMapper mapper) {
        this.supabaseUrl = supabaseUrl;
        this.publishableKey = publishableKey;
        this.members = members;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(final HttpServletRequest request) {
        return "OPTIONS".equals(request.getMethod())
                || request.getRequestURI().endsWith("/v1/health");
    }

    @Override
    protected void doFilterInternal(final HttpServletRequest request,
            final HttpServletResponse response, final FilterChain chain)
            throws ServletException, IOException {
        if (supabaseUrl.isBlank() || publishableKey.isBlank()) {
            fail(response, 503, "AUTH_NOT_CONFIGURED");
            return;
        }
        final String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            fail(response, 401, "UNAUTHORIZED");
            return;
        }
        try {
            @SuppressWarnings("unchecked")
            final Map<String, Object> user = http.get()
                    .uri(supabaseUrl + "/auth/v1/user")
                    .header("apikey", publishableKey)
                    .header(HttpHeaders.AUTHORIZATION, header)
                    .retrieve().body(Map.class);
            if (user == null || user.get("id") == null || user.get("email") == null
                    || user.get("email_confirmed_at") == null) {
                fail(response, 401, "UNAUTHORIZED");
                return;
            }
            final UUID authId = UUID.fromString(user.get("id").toString());
            final String email = user.get("email").toString();
            // Supabase verifies the token and email. Link an existing active club member on first login.
            members.linkActiveMember(authId, email);
            final var member = members.findByAuthUserId(authId).orElse(null);
            if (member == null || !Boolean.TRUE.equals(member.getIsActive())) {
                fail(response, 403, "MEMBER_NOT_LINKED");
                return;
            }
            request.setAttribute("memberId", member.getId());
            request.setAttribute("member", member);
            chain.doFilter(request, response);
        } catch (org.springframework.web.client.HttpClientErrorException error) {
            fail(response, 401, "UNAUTHORIZED");
        } catch (RestClientException error) {
            fail(response, 503, "AUTH_SERVICE_UNAVAILABLE");
        } catch (DataAccessException error) {
            fail(response, 503, "DATABASE_NOT_READY");
        } catch (IllegalArgumentException error) {
            fail(response, 401, "UNAUTHORIZED");
        }
    }

    private void fail(final HttpServletResponse response, final int status, final String code)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getWriter(), ApiResponse.error(code, code));
    }
}
