package com.projectf.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

public record ApiResponse<T>(boolean success, T data, String message, String errorCode, Instant timestamp,
                             @JsonInclude(JsonInclude.Include.NON_NULL) List<ErrorDetail> errorDetails) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, "OK", null, Instant.now(), null);
    }

    public static ApiResponse<Void> error(String code, String message) {
        return error(code, message, null);
    }

    public static ApiResponse<Void> error(String code, String message, List<ErrorDetail> details) {
        return new ApiResponse<>(false, null, message, code, Instant.now(), details);
    }

    public record ErrorDetail(String field, Object rejectedValue, String message) { }
}
