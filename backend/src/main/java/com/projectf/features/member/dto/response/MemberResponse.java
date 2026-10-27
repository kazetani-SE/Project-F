package com.projectf.features.member.dto.response;
import com.projectf.common.enums.Department;
import com.projectf.features.member.entity.ClubRole;
import java.time.Instant;
import java.util.UUID;
public record MemberResponse(UUID id, String studentId, String fullName, String email, String phone,
        Department department, ClubRole clubRole, String batch, Boolean isActive,
        Instant createdAt, Instant inactiveAt, UUID authUserId) { }
