package com.projectf.features.event.dto.request;
import com.projectf.features.event.entity.EventRole;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
public record AssignOrganizerRequest(@NotNull UUID eventId,@NotNull UUID memberId,
 EventRole role,String assignedTasks) {}
