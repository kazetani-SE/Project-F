package com.projectf.features.auth.service.impl;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.exception.ApiException;
import com.projectf.common.security.AccessPolicy;
import com.projectf.features.auth.dto.request.ForgotPasswordRequest;
import com.projectf.features.auth.dto.request.LoginRequest;
import com.projectf.features.auth.dto.request.RefreshTokenRequest;
import com.projectf.features.auth.dto.request.ResetPasswordRequest;
import com.projectf.features.auth.dto.request.UpdateProfileRequest;
import com.projectf.features.auth.dto.response.AccountResponse;
import com.projectf.features.auth.dto.response.AuthTokenResponse;
import com.projectf.features.auth.service.AuthService;
import com.projectf.features.auth.service.VerifiedEmail;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ChallengeNameType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CodeMismatchException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ConfirmForgotPasswordRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ExpiredCodeException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InvalidPasswordException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.NotAuthorizedException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.RespondToAuthChallengeRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.RespondToAuthChallengeResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserNotFoundException;

@Service
public class AuthServiceImpl implements AuthService {
    private static final String HMAC_SHA256 = "HmacSHA256";
    private final MemberService members;
    private final VerifiedEmail verifiedEmail;
    private final CognitoIdentityProviderClient cognito;
    private final String clientId;
    private final String clientSecret;

    public AuthServiceImpl(
            MemberService members,
            VerifiedEmail verifiedEmail,
            CognitoIdentityProviderClient cognito,
            @Value("${aws.cognito.client-id:${AWS_COGNITO_CLIENT_ID:}}") String clientId,
            @Value("${aws.cognito.client-secret:${AWS_COGNITO_CLIENT_SECRET:}}") String clientSecret
    ) {
        this.members = members;
        this.verifiedEmail = verifiedEmail;
        this.cognito = cognito;
        this.clientId = clientId == null ? "" : clientId.strip();
        this.clientSecret = clientSecret == null ? "" : clientSecret.strip();
    }

    @Override
    public AccountResponse resolveAccount(Jwt jwt) {
        UUID authUserId;
        try {
            authUserId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw AccessPolicy.forbidden(exception);
        }
        // Chỉ tài khoản chưa liên kết mới phải kiểm tra email đã xác nhận với AWS Cognito.
        MemberResponse member = members.findByAuthUserId(authUserId)
                .or(() -> members.claimAccount(authUserId, verifiedEmail.forToken(jwt)))
                .filter(linked -> Boolean.TRUE.equals(linked.active()))
                .orElseThrow(AccessPolicy::forbidden);
        return toAccount(member);
    }

    @Override
    public AccountResponse updateProfile(Jwt jwt, UpdateProfileRequest request) {
        AccountResponse account = resolveAccount(jwt);
        return toAccount(members.updateOwnProfile(account.id(), UUID.fromString(jwt.getSubject()),
                request.fullName(), request.phone()));
    }

    private static AccountResponse toAccount(MemberResponse member) {
        ClubRole role = member.clubRole() == null ? ClubRole.MEMBER : member.clubRole();
        return new AccountResponse(member.id(), member.fullName(), member.email(), role, member.phone());
    }

    @Override
    public AuthTokenResponse login(LoginRequest request) {
        requireClientId();
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        Map<String, String> params = new HashMap<>();
        params.put("USERNAME", email);
        params.put("PASSWORD", request.password());
        addSecretHashIfConfigured(params, email);

        try {
            InitiateAuthResponse response = cognito.initiateAuth(InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .clientId(clientId)
                    .authParameters(params)
                    .build());

            AuthenticationResultType result = response.authenticationResult();
            if (response.challengeName() == ChallengeNameType.NEW_PASSWORD_REQUIRED) {
                Map<String, String> answers = new HashMap<>();
                answers.put("USERNAME", email);
                answers.put("NEW_PASSWORD", request.password());
                addSecretHashIfConfigured(answers, email);
                RespondToAuthChallengeResponse challengeRes = cognito.respondToAuthChallenge(
                        RespondToAuthChallengeRequest.builder()
                                .challengeName(ChallengeNameType.NEW_PASSWORD_REQUIRED)
                                .clientId(clientId)
                                .session(response.session())
                                .challengeResponses(answers)
                                .build());
                result = challengeRes.authenticationResult();
            }
            return toTokenResponse(result, null);
        } catch (NotAuthorizedException | UserNotFoundException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Email hoặc mật khẩu không chính xác.", exception);
        } catch (CognitoIdentityProviderException exception) {
            throw mapCognitoException(exception);
        } catch (SdkException exception) {
            throw authUnavailable(exception);
        }
    }

    @Override
    public AuthTokenResponse refresh(RefreshTokenRequest request) {
        requireClientId();
        Map<String, String> params = new HashMap<>();
        params.put("REFRESH_TOKEN", request.refreshToken().strip());
        if (request.email() != null && !request.email().isBlank()) {
            addSecretHashIfConfigured(params, request.email().strip().toLowerCase(Locale.ROOT));
        }
        try {
            InitiateAuthResponse response = cognito.initiateAuth(InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH)
                    .clientId(clientId)
                    .authParameters(params)
                    .build());
            return toTokenResponse(response.authenticationResult(), request.refreshToken().strip());
        } catch (CognitoIdentityProviderException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED",
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", exception);
        } catch (SdkException exception) {
            throw authUnavailable(exception);
        }
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        requireClientId();
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        try {
            software.amazon.awssdk.services.cognitoidentityprovider.model.ForgotPasswordRequest.Builder builder =
                    software.amazon.awssdk.services.cognitoidentityprovider.model.ForgotPasswordRequest.builder()
                            .clientId(clientId)
                            .username(email);
            if (!clientSecret.isBlank()) {
                builder.secretHash(computeSecretHash(email));
            }
            cognito.forgotPassword(builder.build());
        } catch (UserNotFoundException ignored) {
            // Không tiết lộ email có tồn tại hay không để chống dò quét tài khoản.
        } catch (CognitoIdentityProviderException exception) {
            throw mapCognitoException(exception);
        } catch (SdkException exception) {
            throw authUnavailable(exception);
        }
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        requireClientId();
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        try {
            ConfirmForgotPasswordRequest.Builder builder = ConfirmForgotPasswordRequest.builder()
                    .clientId(clientId)
                    .username(email)
                    .confirmationCode(request.code().strip())
                    .password(request.newPassword());
            if (!clientSecret.isBlank()) {
                builder.secretHash(computeSecretHash(email));
            }
            cognito.confirmForgotPassword(builder.build());
        } catch (CodeMismatchException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OTP",
                    "Mã xác nhận (OTP) không chính xác.", exception);
        } catch (ExpiredCodeException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EXPIRED_OTP",
                    "Mã xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.", exception);
        } catch (InvalidPasswordException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD",
                    "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.", exception);
        } catch (CognitoIdentityProviderException exception) {
            throw mapCognitoException(exception);
        } catch (SdkException exception) {
            throw authUnavailable(exception);
        }
    }

    private static AuthTokenResponse toTokenResponse(AuthenticationResultType result, String fallbackToken) {
        if (result == null || result.idToken() == null || result.idToken().isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTH_FAILED", "Không nhận được token hợp lệ từ AWS Cognito.");
        }
        String refresh = result.refreshToken() != null && !result.refreshToken().isBlank()
                ? result.refreshToken()
                : fallbackToken;
        return new AuthTokenResponse(result.idToken(), refresh, result.expiresIn());
    }

    private void requireClientId() {
        if (clientId.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "COGNITO_NOT_CONFIGURED",
                    "Backend chưa cấu hình AWS_COGNITO_CLIENT_ID.");
        }
    }

    private void addSecretHashIfConfigured(Map<String, String> target, String username) {
        if (!clientSecret.isBlank()) {
            target.put("SECRET_HASH", computeSecretHash(username));
        }
    }

    private String computeSecretHash(String username) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            SecretKeySpec keySpec = new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256);
            mac.init(keySpec);
            mac.update(username.getBytes(StandardCharsets.UTF_8));
            byte[] rawHmac = mac.doFinal(clientId.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawHmac);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Failed to compute Cognito SECRET_HASH", exception);
        }
    }

    private static ApiException mapCognitoException(CognitoIdentityProviderException exception) {
        String message = exception.awsErrorDetails() != null && exception.awsErrorDetails().errorMessage() != null
                ? exception.awsErrorDetails().errorMessage()
                : "Yêu cầu xác thực AWS Cognito thất bại.";
        return new ApiException(HttpStatus.BAD_REQUEST, "COGNITO_AUTH_ERROR", message, exception);
    }

    private static ApiException authUnavailable(Throwable cause) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AUTH_UNAVAILABLE",
                "Không thể kết nối tới dịch vụ AWS Cognito.", cause);
    }
}
