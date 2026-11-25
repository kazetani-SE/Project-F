package com.projectf.features.auth.service;

import com.projectf.common.exception.ApiException;
import com.projectf.common.security.AccessPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserResponse;

@Component
public class VerifiedEmail {
    private static final String ACCESS_TOKEN_USE = "access";
    private final CognitoIdentityProviderClient cognito;

    public VerifiedEmail(CognitoIdentityProviderClient cognito) {
        this.cognito = cognito;
    }

    public String forToken(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        String verified;
        if (email != null && !email.isBlank() && Boolean.TRUE.equals(emailVerified)) {
            verified = email.strip();
        } else if (ACCESS_TOKEN_USE.equals(jwt.getClaimAsString("token_use"))) {
            verified = resolveFromCognitoUserInfo(jwt);
        } else {
            throw AccessPolicy.forbidden();
        }
        return verified;
    }

    private String resolveFromCognitoUserInfo(Jwt jwt) {
        GetUserResponse response;
        try {
            response = cognito.getUser(GetUserRequest.builder()
                    .accessToken(jwt.getTokenValue())
                    .build());
        } catch (CognitoIdentityProviderException exception) {
            int status = exception.statusCode();
            if (status == 400 || status == 401 || status == 403) {
                throw AccessPolicy.forbidden(exception);
            }
            throw unavailable(exception);
        } catch (SdkException exception) {
            throw unavailable(exception);
        }
        String sub = attribute(response, "sub");
        String email = attribute(response, "email");
        String emailVerified = attribute(response, "email_verified");
        if (email == null || email.isBlank() || !"true".equalsIgnoreCase(emailVerified)
                || sub == null || !sub.equalsIgnoreCase(jwt.getSubject())) {
            throw AccessPolicy.forbidden();
        }
        return email.strip();
    }

    private static String attribute(GetUserResponse response, String name) {
        String value = null;
        if (response != null && response.hasUserAttributes()) {
            for (AttributeType attr : response.userAttributes()) {
                if (name.equals(attr.name())) {
                    value = attr.value();
                    break;
                }
            }
        }
        return value;
    }

    private static ApiException unavailable(Throwable cause) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AUTH_UNAVAILABLE", "Account verification unavailable", cause);
    }
}
