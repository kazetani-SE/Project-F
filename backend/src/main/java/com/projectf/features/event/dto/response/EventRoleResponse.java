package com.projectf.features.event.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.projectf.features.event.entity.EventRole;

public record EventRoleResponse(@JsonInclude(JsonInclude.Include.ALWAYS) EventRole role) {}
