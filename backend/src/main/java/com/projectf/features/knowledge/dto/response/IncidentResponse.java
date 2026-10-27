package com.projectf.features.knowledge.dto.response;

import com.projectf.common.enums.Department;
import com.projectf.features.knowledge.entity.IncidentSeverity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record IncidentResponse(UUID id, UUID eventId, UUID reportedBy, String title,
        IncidentSeverity severity, List<Department> departmentInvolved,
        String incidentDescription, String rootCause, String immediateSolution,
        String lessonLearned, Instant createdAt) { }
