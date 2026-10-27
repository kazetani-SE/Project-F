package com.projectf.features.member.dto.request;

import com.projectf.common.enums.Department;
import com.projectf.features.member.entity.ClubRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record MemberRequest(@Size(min = 8, max = 8) String studentId,
        String fullName, @Email String email, String phone, Department department,
        ClubRole clubRole, @Size(max = 4) String batch, Boolean isActive, Instant inactiveAt) { }
