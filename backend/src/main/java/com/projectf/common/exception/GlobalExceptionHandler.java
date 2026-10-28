package com.projectf.common.exception;
import com.projectf.common.response.ApiResponse;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.validation.FieldError;
@RestControllerAdvice
@SuppressWarnings("PMD.AtLeastOneConstructor")
public class GlobalExceptionHandler {
 @ExceptionHandler(MethodArgumentNotValidException.class)
 public ResponseEntity<ApiResponse<Void>> validation(final MethodArgumentNotValidException exception) {
  final String message=exception.getBindingResult().getAllErrors().stream()
   .map(error -> error instanceof FieldError fieldError
    ? fieldError.getField()+": "+fieldError.getDefaultMessage() : error.getDefaultMessage())
   .distinct().collect(Collectors.joining("; "));
  return ResponseEntity.badRequest().body(ApiResponse.error(message));
 }
 @ExceptionHandler(IllegalArgumentException.class)
 public ResponseEntity<ApiResponse<Void>> invalidArgument(final IllegalArgumentException exception) {
  return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
 }
 @ExceptionHandler(Exception.class)
 public ResponseEntity<ApiResponse<Void>> unexpected(final Exception exception) {
  // Không trả stack trace hoặc thông tin database cho client.
  return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("Internal server error"));
 }
}
