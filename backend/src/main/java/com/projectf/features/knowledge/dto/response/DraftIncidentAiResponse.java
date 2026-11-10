package com.projectf.features.knowledge.dto.response;

import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import java.util.List;

public record DraftIncidentAiResponse(
        String title,
        IncidentSeverity severity,
        List<Department> departments,
        String description,
        String rootCause,
        String immediateSolution,
        String lessonLearned,
        String modelUsed,
        String modelTier,
        String routingReason
) {
}
