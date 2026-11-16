package com.projectf.features.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.projectf.common.exception.ApiException;
import com.projectf.common.security.AccessPolicy;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class VerifiedEmail {
    private final RestClient auth;

    public VerifiedEmail(@Value("${SUPABASE_AUTH_ISSUER}") String issuer,
                         @Value("${SUPABASE_PUBLISHABLE_KEY}") String publishableKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(5));
        auth = RestClient.builder().requestFactory(factory).baseUrl(issuer)
                .defaultHeader("apikey", publishableKey).build();
    }

    public String forToken(Jwt jwt) {
        AuthUser user;
        try {
            user = auth.get().uri("/user").headers(headers -> headers.setBearerAuth(jwt.getTokenValue()))
                    .retrieve().body(AuthUser.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                throw AccessPolicy.forbidden(exception);
            }
            throw unavailable(exception);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
        String email = jwt.getClaimAsString("email");
        if (user == null || user.emailConfirmedAt() == null || user.emailConfirmedAt().isBlank()
                || !jwt.getSubject().equals(user.id()) || email == null || email.isBlank()
                || !email.equalsIgnoreCase(user.email())) {
            throw AccessPolicy.forbidden();
        }
        return email;
    }

    private static ApiException unavailable(Throwable cause) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AUTH_UNAVAILABLE", "Account verification unavailable", cause);
    }

    private record AuthUser(String id, String email, @JsonProperty("email_confirmed_at") String emailConfirmedAt) { }
}
