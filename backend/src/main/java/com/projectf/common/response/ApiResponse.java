package com.projectf.common.response;
public record ApiResponse<T>(boolean success,T data,String message) {
 public static <T> ApiResponse<T> successful(final T data) { return new ApiResponse<>(true,data,null); }
 public static <T> ApiResponse<T> error(final String message) { return new ApiResponse<>(false,null,message); }
}
