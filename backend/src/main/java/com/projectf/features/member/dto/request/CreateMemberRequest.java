package com.projectf.features.member.dto.request;
import com.projectf.common.enums.*;
import jakarta.validation.constraints.*;
public record CreateMemberRequest(
 @NotBlank @Size(min=8,max=8) String studentId,
 @NotBlank @Size(max=100) String fullName,
 @NotBlank @Email @Size(max=100) String email,
 @Size(max=15) String phone,
 Department department, ClubRole clubRole,
 @NotBlank @Size(max=4) String batch) {}
