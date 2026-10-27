package com.projectf.common.exception;

import com.projectf.common.response.ApiResponse;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final Set<String> CLIENT_CODES = Set.of("VALIDATION_FAILED", "DUPLICATE_RESOURCE",
            "INVALID_EVENT_DATE_RANGE", "BUDGET_OVER_ALLOCATED", "EXPENSE_RECEIPT_REQUIRED",
            "FILE_SIZE_EXCEEDED", "UNSUPPORTED_FILE_TYPE");

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> invalid(final IllegalArgumentException error) {
        final String code = CLIENT_CODES.contains(error.getMessage()) ? error.getMessage() : "VALIDATION_FAILED";
        final HttpStatus status = "DUPLICATE_RESOURCE".equals(code)
                ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(ApiResponse.error(code, code));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> validation(final MethodArgumentNotValidException error) {
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_FAILED", "Invalid request"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> malformed(final Exception error) {
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_FAILED", "Invalid request"));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Void>> missing(final NoSuchElementException error) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("RESOURCE_NOT_FOUND", "Resource not found"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> conflict(final DataIntegrityViolationException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("DUPLICATE_RESOURCE", "Database constraint violated"));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> forbidden(final SecurityException error) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("FORBIDDEN", "Permission denied"));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> unavailable(final IllegalStateException error) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.error(error.getMessage(), error.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpected(final Exception error) {
        LOG.error("Unexpected API error: {}", error.getMessage(), error);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("INTERNAL_SERVER_ERROR", "Unexpected server error"));
    }
}
