package com.projectf.features.member.dto.request;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;
import jakarta.validation.constraints.*;
public record UpdateMemberRequest(
 @NotBlank @Size(max=100) String fullName,
 @NotBlank @Email @Size(max=100) String email,
 @Size(max=15) String phone,
 Department department, ClubRole clubRole,
 @NotBlank @Size(max=4) String batch,
 @JsonAlias("isActive") Boolean active) {}
