package com.projectf.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.common.response.ApiResponse;
import com.projectf.common.security.AccessPolicy;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final String[] SWAGGER = {"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"};
    private static final String[] EVENT_INTERNAL = {
        "/v1/events/{eventId}/documents/**", "/v1/events/{eventId}/media-assets/**",
        "/v1/events/{eventId}/incidents/**", "/v1/events/{eventId}/feedbacks/**"
    };
    private static final String[] RESOURCE_ALIASES = {
        "/v1/documents/**", "/v1/media-assets/**", "/v1/incidents/**", "/v1/faqs/**",
        "/v1/feedbacks/**", "/v1/storage/**", "/v1/finance/**"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AccessPolicy access, ObjectMapper json) throws Exception {
        // Một chuỗi lọc JWT cho mọi profile; phân quyền chi tiết của Task 1 đặt tại Controller.
        return http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> unauthorized(response, json))
                        .accessDeniedHandler((request, response, exception) ->
                                writeError(response, json, 403, "FORBIDDEN", "Access denied")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(SWAGGER).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/auth/me").authenticated()
                        .requestMatchers(HttpMethod.GET, EVENT_INTERNAL)
                        .access((authentication, context) -> {
                            String id = context.getVariables().get("eventId");
                            boolean permitted = id != null && access.canAccessEvent(id, authentication.get());
                            return new AuthorizationDecision(permitted);
                        })
                        // Các slice khác chưa có RBAC theo vai trò BTC: chỉ Ban Chủ nhiệm được ghi.
                        .requestMatchers(EVENT_INTERNAL)
                        .access((authentication, context) -> new AuthorizationDecision(access.isAdmin(authentication.get())))
                        .requestMatchers(RESOURCE_ALIASES)
                        .access((authentication, context) -> new AuthorizationDecision(access.isAdmin(authentication.get())))
                        .requestMatchers(HttpMethod.GET, "/v1/event-series/{seriesId}/faqs/**")
                        .access((authentication, context) -> new AuthorizationDecision(access.isActiveMember(authentication.get())))
                        .requestMatchers("/v1/event-series/{seriesId}/faqs/**")
                        .access((authentication, context) -> new AuthorizationDecision(access.isAdmin(authentication.get())))
                        .requestMatchers("/v1/**")
                        .access((authentication, context) -> new AuthorizationDecision(access.isActiveMember(authentication.get())))
                        .anyRequest().denyAll())
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
