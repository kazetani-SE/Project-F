package com.projectf.features.member.dto.response;
import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;
import java.time.OffsetDateTime;
import java.util.UUID;
public record MemberResponse(UUID id,String studentId,String fullName,String email,String phone,
 Department department,ClubRole clubRole,String batch,Boolean active,OffsetDateTime createdAt,OffsetDateTime inactiveAt) {}
