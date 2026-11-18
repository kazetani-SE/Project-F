package com.projectf.features.member.dto.response;

import java.util.UUID;

public record MemberImportRow(int rowNumber, String studentId, String fullName, String email,
                              String phone, String department, String batch, String status,
                              String reason, UUID memberId) { }
