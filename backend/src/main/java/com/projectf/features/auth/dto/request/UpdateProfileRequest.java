package com.projectf.features.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 100) String fullName,
        @Size(max = 15)
        @Pattern(regexp = "^$|^[0-9+\\-\\s]{8,15}$", message = "Số điện thoại không hợp lệ")
        String phone
) { }
