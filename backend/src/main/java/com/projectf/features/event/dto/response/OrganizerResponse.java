package com.projectf.features.event.dto.response;

import com.projectf.features.event.entity.EventRole;
import java.time.Instant;
import java.util.UUID;

public record OrganizerResponse(UUID id, UUID eventId, UUID memberId,
        EventRole role, String assignedTasks, Instant joinedAt) { }
