package com.projectf.features.auth.dto.response;

public record AuthTokenResponse(
        String accessToken,
        String refreshToken,
        Integer expiresIn
) { }
