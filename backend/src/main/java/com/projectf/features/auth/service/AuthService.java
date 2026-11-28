package com.projectf.features.auth.service;

import com.projectf.features.auth.dto.request.ForgotPasswordRequest;
import com.projectf.features.auth.dto.request.LoginRequest;
import com.projectf.features.auth.dto.request.RefreshTokenRequest;
import com.projectf.features.auth.dto.request.ResetPasswordRequest;
import com.projectf.features.auth.dto.request.UpdateProfileRequest;
import com.projectf.features.auth.dto.response.AccountResponse;
import com.projectf.features.auth.dto.response.AuthTokenResponse;
import org.springframework.security.oauth2.jwt.Jwt;

public interface AuthService {
    AccountResponse resolveAccount(Jwt jwt);
    AccountResponse updateProfile(Jwt jwt, UpdateProfileRequest request);

    AuthTokenResponse login(LoginRequest request);

    AuthTokenResponse refresh(RefreshTokenRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);
}
