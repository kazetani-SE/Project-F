package com.projectf.features.knowledge.dto.request;

import com.projectf.common.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;

public record KnowledgeApprovalRequest(@NotNull ApprovalStatus status, String rejectionReason) { }
