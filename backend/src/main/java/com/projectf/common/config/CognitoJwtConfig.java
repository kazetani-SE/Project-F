package com.projectf.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class CognitoJwtConfig {
    private static final String ID_TOKEN_USE = "id";
    private static final String ACCESS_TOKEN_USE = "access";

    @Bean
    public JwtDecoder cognitoJwtDecoder(
            @Value("${aws.cognito.region:${AWS_REGION:ap-southeast-1}}") String region,
            @Value("${aws.cognito.user-pool-id:${AWS_COGNITO_USER_POOL_ID:}}") String userPoolId,
            @Value("${aws.cognito.client-id:${AWS_COGNITO_CLIENT_ID:}}") String clientId,
            @Value("${AWS_COGNITO_ISSUER:}") String explicitIssuer,
            @Value("${AWS_COGNITO_JWKS_URI:}") String explicitJwksUri
    ) {
        String issuer = resolveIssuer(region, userPoolId, explicitIssuer);
        String jwksUri = explicitJwksUri != null && !explicitJwksUri.isBlank()
                ? explicitJwksUri
                : issuer + "/.well-known/jwks.json";
        return buildDecoder(issuer, jwksUri, clientId);
    }

    public JwtDecoder cognitoJwtDecoder(String issuer, String jwksUri, String clientId) {
        return buildDecoder(issuer, jwksUri, clientId);
    }

    private static String resolveIssuer(String region, String userPoolId, String explicitIssuer) {
        String resolved;
        if (explicitIssuer != null && !explicitIssuer.isBlank()) {
            resolved = explicitIssuer.strip();
        } else if (userPoolId != null && !userPoolId.isBlank()) {
            String poolRegion = userPoolId.contains("_")
                    ? userPoolId.substring(0, userPoolId.indexOf('_'))
                    : region;
            resolved = "https://cognito-idp." + poolRegion + ".amazonaws.com/" + userPoolId.strip();
        } else {
            resolved = "https://cognito-idp." + region + ".amazonaws.com/ap-southeast-1_local";
        }
        return resolved;
    }

    private static JwtDecoder buildDecoder(String issuer, String jwksUri, String expectedClientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri)
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.RS256);
                    algorithms.add(SignatureAlgorithm.ES256);
                }).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer),
                jwt -> validateUserToken(jwt, expectedClientId)
        ));
        return decoder;
    }

    private static OAuth2TokenValidatorResult validateUserToken(Jwt jwt, String expectedClientId) {
        String tokenUse = jwt.getClaimAsString("token_use");
        boolean valid = tokenUse != null && !tokenUse.isBlank()
                && validateCognitoToken(jwt, tokenUse, expectedClientId);
        return valid
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "Expected a valid AWS Cognito user token", null));
    }

    private static boolean validateCognitoToken(Jwt jwt, String tokenUse, String expectedClientId) {
        boolean hasBasicClaims = jwt.getExpiresAt() != null && isUuid(jwt.getSubject());
        boolean validUse = ID_TOKEN_USE.equals(tokenUse) || ACCESS_TOKEN_USE.equals(tokenUse);
        boolean clientMatches = true;
        if (expectedClientId != null && !expectedClientId.isBlank()) {
            if (ID_TOKEN_USE.equals(tokenUse)) {
                clientMatches = jwt.getAudience() != null && jwt.getAudience().contains(expectedClientId);
            } else {
                clientMatches = expectedClientId.equals(jwt.getClaimAsString("client_id"));
            }
        }
        return hasBasicClaims && validUse && clientMatches;
    }

    private static boolean isUuid(String subject) {
        return subject != null && subject.matches(
                "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    }
}
