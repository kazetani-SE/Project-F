package com.projectf;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.projectf.common.config.SupabaseJwtConfig;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SupabaseJwtTest {
    private static final String ISSUER = "https://auth.example.test/auth/v1";

    @Test
    void acceptsOnlyValidSignedUserTokensForThisIssuerAndAudience() throws Exception {
        RSAKey key = new RSAKeyGenerator(2048).keyID("test").generate();
        byte[] jwks = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/jwks", exchange -> {
            try (exchange) {
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jwks.length);
                exchange.getResponseBody().write(jwks);
            }
        });
        server.start();
        try {
            JwtDecoder decoder = new SupabaseJwtConfig().supabaseJwtDecoder(ISSUER,
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/jwks");
            String subject = UUID.randomUUID().toString();
            String valid = signed(key, ISSUER, "authenticated", subject, Instant.now().plusSeconds(300));
            assertEquals(subject, decoder.decode(valid).getSubject());
            String expired = signed(key, ISSUER, "authenticated", subject, Instant.now().minusSeconds(120));
            assertThrows(JwtException.class, () -> decoder.decode(expired));
            String wrongAudience = signed(key, ISSUER, "another-api", subject, Instant.now().plusSeconds(300));
            assertThrows(JwtException.class, () -> decoder.decode(wrongAudience));
            String wrongIssuer = signed(key, "https://other.example.test", "authenticated", subject,
                    Instant.now().plusSeconds(300));
            assertThrows(JwtException.class, () -> decoder.decode(wrongIssuer));
            RSAKey otherKey = new RSAKeyGenerator(2048).keyID("test").generate();
            String forged = signed(otherKey, ISSUER, "authenticated", subject, Instant.now().plusSeconds(300));
            assertThrows(JwtException.class, () -> decoder.decode(forged));
        } finally {
            server.stop(0);
        }
    }

    private static String signed(RSAKey key, String issuer, String audience, String subject, Instant expires)
            throws Exception {
        SignedJWT token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256)
                .keyID(key.getKeyID()).type(JOSEObjectType.JWT).build(), new JWTClaimsSet.Builder()
                .issuer(issuer).audience(audience).subject(subject).expirationTime(Date.from(expires))
                .claim("role", "authenticated").build());
        token.sign(new RSASSASigner(key));
        return token.serialize();
    }
}
