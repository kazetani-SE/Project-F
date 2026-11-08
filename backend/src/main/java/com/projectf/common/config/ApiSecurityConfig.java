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
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class ApiSecurityConfig {
    @Bean
    public SecurityFilterChain apiSecurity(HttpSecurity http, AccessPolicy access, ObjectMapper json) throws Exception {
        return http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> unauthorized(response, json))
                        .accessDeniedHandler((request, response, exception) ->
                                writeError(response, json, 403, "FORBIDDEN", "Access denied")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/auth/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/v1/**")
                        .access((authentication, context) -> new AuthorizationDecision(access.isActiveMember(authentication.get())))
                        .requestMatchers("/v1/**")
                        .access((authentication, context) -> new AuthorizationDecision(access.isAdmin(authentication.get())))
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
