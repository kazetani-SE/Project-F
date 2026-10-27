package com.projectf.features.finance.dto.request;

import com.projectf.common.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;

public record ApprovalRequest(@NotNull ApprovalStatus status, String rejectionReason) { }
