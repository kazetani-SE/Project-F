package com.projectf.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class SupabaseJwtConfig {
    @Bean
    public JwtDecoder supabaseJwtDecoder(@Value("${SUPABASE_AUTH_ISSUER}") String issuer,
            @Value("${SUPABASE_JWKS_URI:${SUPABASE_AUTH_ISSUER}/.well-known/jwks.json}") String jwksUri) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri)
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.RS256);
                    algorithms.add(SignatureAlgorithm.ES256);
                }).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),
                SupabaseJwtConfig::validateUserToken));
        return decoder;
    }

    private static OAuth2TokenValidatorResult validateUserToken(Jwt jwt) {
        boolean valid = jwt.getExpiresAt() != null && jwt.getAudience() != null && jwt.getAudience().contains("authenticated")
                && "authenticated".equals(jwt.getClaimAsString("role"))
                && !Boolean.TRUE.equals(jwt.getClaimAsBoolean("is_anonymous")) && isUuid(jwt.getSubject());
        return valid ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Expected a Supabase user token", null));
    }

    private static boolean isUuid(String subject) {
        return subject != null && subject.matches(
                "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    }
}
