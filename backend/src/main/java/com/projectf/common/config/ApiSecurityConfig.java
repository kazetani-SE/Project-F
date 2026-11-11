package com.projectf.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.common.response.ApiResponse;
import com.projectf.common.security.AccessPolicy;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class ApiSecurityConfig {
    @Bean
    @Order(1)
    public SecurityFilterChain apiSecurity(HttpSecurity http, AccessPolicy access, ObjectMapper json) throws Exception {
        // Chỉ áp dụng RBAC Task 1. Các route con của Tài chính, Tài liệu và Tri thức giữ chuỗi lọc riêng.
        return http.securityMatcher("/v1/auth/me", "/v1/members", "/v1/members/{id}", "/v1/members/{id}/status",
                        "/v1/members/import", "/v1/members/import/template", "/v1/members/{id}/credentials/resend",
                        "/v1/members/{id}/credentials/provision",
                        "/v1/event-series", "/v1/event-series/{seriesId}", "/v1/events", "/v1/events/{eventId}",
                        "/v1/events/{eventId}/status", "/v1/events/{eventId}/my-role",
                        "/v1/events/{eventId}/organizers", "/v1/events/{eventId}/organizers/{memberId}")
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> unauthorized(response, json))
                        .accessDeniedHandler((request, response, exception) ->
                                writeError(response, json, 403, "FORBIDDEN", "Access denied")))
                .authorizeHttpRequests(auth -> auth
                        // API §2: cho phép tài khoản có JWT hợp lệ gọi /auth/me để liên kết hồ sơ lần đầu.
                        .requestMatchers(HttpMethod.GET, "/v1/auth/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/v1/members/import/template")
                        .access((authentication, context) -> new AuthorizationDecision(access.isAdmin(authentication.get())))
                        .requestMatchers(HttpMethod.GET, "/v1/**")
                        .access((authentication, context) -> new AuthorizationDecision(access.isActiveMember(authentication.get())))
                        .anyRequest()
                        .access((authentication, context) -> new AuthorizationDecision(access.isAdmin(authentication.get()))))
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults())
                        .authenticationEntryPoint((request, response, exception) -> unauthorized(response, json)))
                .build();
    }

    private static void unauthorized(HttpServletResponse response, ObjectMapper json) throws IOException {
        response.setHeader("WWW-Authenticate", "Bearer");
        writeError(response, json, 401, "UNAUTHORIZED", "A valid access token is required");
    }

    private static void writeError(HttpServletResponse response, ObjectMapper json, int status,
                                   String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        json.writeValue(response.getOutputStream(), ApiResponse.error(code, message));
    }
}
