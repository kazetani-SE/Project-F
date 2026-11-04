package com.projectf.common.exception;
import com.projectf.common.response.ApiResponse;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(MethodArgumentNotValidException.class)
 public ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException exception) {
  String message=exception.getBindingResult().getAllErrors().stream()
   .map(error -> error instanceof FieldError fieldError
    ? fieldError.getField()+": "+fieldError.getDefaultMessage() : error.getDefaultMessage())
   .distinct().collect(Collectors.joining("; "));
  return ResponseEntity.badRequest().body(ApiResponse.error(message));
 }
 @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
 public ResponseEntity<ApiResponse<Void>> invalidArgument(Exception exception) {
  return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
 }
 @ExceptionHandler(Exception.class)
 public ResponseEntity<ApiResponse<Void>> unexpected(Exception exception) {
  // Không trả stack trace hoặc thông tin database cho client.
  return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("Internal server error"));
 }
}
