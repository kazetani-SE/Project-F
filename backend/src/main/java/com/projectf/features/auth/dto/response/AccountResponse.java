package com.projectf.features.auth.dto.response;

import com.projectf.common.enums.ClubRole;
import java.util.UUID;

public record AccountResponse(UUID id, String fullName, String email, ClubRole clubRole) { }
