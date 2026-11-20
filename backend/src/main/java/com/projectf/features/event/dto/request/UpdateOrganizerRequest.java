package com.projectf.features.event.dto.request;

import com.projectf.features.event.entity.EventRole;
import jakarta.validation.constraints.NotNull;

public record UpdateOrganizerRequest(@NotNull EventRole role, String assignedTasks) { }
