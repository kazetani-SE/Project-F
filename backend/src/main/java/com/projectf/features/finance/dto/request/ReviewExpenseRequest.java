package com.projectf.features.finance.dto.request;

import com.projectf.common.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReviewExpenseRequest(
    @NotNull(message = "Trạng thái phê duyệt là bắt buộc")
    ApprovalStatus status,

    UUID approvedBy,

    String rejectionReason
) {}

