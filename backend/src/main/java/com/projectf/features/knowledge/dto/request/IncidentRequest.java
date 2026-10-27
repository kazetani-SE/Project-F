package com.projectf.features.knowledge.dto.request;

import com.projectf.common.enums.Department;
import com.projectf.features.knowledge.entity.IncidentSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IncidentRequest(@NotBlank String title, @NotNull IncidentSeverity severity,
        @NotEmpty List<@NotNull Department> departmentInvolved,
        @NotBlank String incidentDescription, @NotBlank String rootCause,
        @NotBlank String immediateSolution, @NotBlank String lessonLearned) { }
