package com.projectf.features.finance.dto.response;

import com.projectf.common.enums.ApprovalStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record BudgetItemResponse(
    UUID id,
    UUID eventId,
    UUID categoryId,
    UUID benchmarkId,
    UUID mediaAsset,
    String itemName,
    BigDecimal quantity,
    String unit,
    BigDecimal estimatedUnitPrice,
    BigDecimal totalEstimatedAmount,
    String notes,
    ApprovalStatus approvalStatus,
    UUID approvedBy,
    OffsetDateTime approvedAt,
    String rejectionReason,
    OffsetDateTime createdAt
) {}

