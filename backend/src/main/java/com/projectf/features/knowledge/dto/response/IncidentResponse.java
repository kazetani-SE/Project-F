package com.projectf.features.knowledge.dto.response;

import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record IncidentResponse(
        UUID id,
        UUID eventId,
        UUID reportedBy,
        String title,
        IncidentSeverity severity,
        List<Department> departments,
        String description,
        String rootCause,
        String immediateSolution,
        String lessonLearned,
        OffsetDateTime createdAt
) {
}
