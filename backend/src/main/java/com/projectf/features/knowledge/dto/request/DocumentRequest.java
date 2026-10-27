package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record DocumentRequest(UUID parentDocumentId,
        @NotBlank @Pattern(regexp = "MASTER_PLAN|RUNNING_ORDER|SPONSOR_PROPOSAL|MEETING_MINUTES|RISK_PLAN|OTHER") String docType,
        @NotBlank String title, @NotBlank String version, @NotBlank String fileUrl) { }
