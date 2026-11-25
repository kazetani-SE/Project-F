package com.projectf.features.auth.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.auth.dto.request.ForgotPasswordRequest;
import com.projectf.features.auth.dto.request.LoginRequest;
import com.projectf.features.auth.dto.request.RefreshTokenRequest;
import com.projectf.features.auth.dto.request.ResetPasswordRequest;
import com.projectf.features.auth.dto.response.AccountResponse;
import com.projectf.features.auth.dto.response.AuthTokenResponse;
import com.projectf.features.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(auth.login(request)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(auth.refresh(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        auth.forgotPassword(request);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        auth.resetPassword(request);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AccountResponse>> me(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(auth.resolveAccount(jwt)));
    }
}
