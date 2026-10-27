package com.projectf.features.finance.dto.response;

import com.projectf.common.enums.ApprovalStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BudgetItemResponse(UUID id, UUID eventId, UUID categoryId, UUID benchmarkId,
        String itemName, UUID mediaAsset, BigDecimal quantity, String unit,
        BigDecimal estimatedUnitPrice, BigDecimal totalEstimatedAmount, String notes,
        ApprovalStatus approvalStatus, UUID approvedBy, Instant approvedAt,
        String rejectionReason, Instant createdAt) { }
