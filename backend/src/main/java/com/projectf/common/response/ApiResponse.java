package com.projectf.common.response;

import java.time.Instant;

public record ApiResponse<T>(boolean success, String message, T data, String errorCode,
        Instant timestamp) {
    public static <T> ApiResponse<T> ok(final T data) {
        return new ApiResponse<>(true, "OK", data, null, Instant.now());
    }

    public static <T> ApiResponse<T> created(final T data) {
        return new ApiResponse<>(true, "Created", data, null, Instant.now());
    }

    public static ApiResponse<Void> error(final String code, final String message) {
        return new ApiResponse<>(false, message, null, code, Instant.now());
    }
}
