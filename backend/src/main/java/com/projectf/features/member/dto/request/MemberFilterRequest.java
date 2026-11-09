package com.projectf.features.member.dto.request;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;

public record MemberFilterRequest(String keyword, Department department, ClubRole role, String batch,
                                  Boolean isActive) { }
