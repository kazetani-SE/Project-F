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
    BigDecimal estUnitPrice,
    BigDecimal totalEstAmount,
    String notes,
    ApprovalStatus approvalStatus,
    UUID approvedBy,
    OffsetDateTime approvedAt,
    String rejectionReason,
    OffsetDateTime createdAt,
    BenchmarkInfo benchmark
) {
    public record BenchmarkInfo(
        String supplierName,
        String supplierLink,
        OffsetDateTime lastUpdatedAt
    ) {}

    public BudgetItemResponse(
        UUID id,
        UUID eventId,
        UUID categoryId,
        UUID benchmarkId,
        UUID mediaAsset,
        String itemName,
        BigDecimal quantity,
        String unit,
        BigDecimal estUnitPrice,
        BigDecimal totalEstAmount,
        String notes,
        ApprovalStatus approvalStatus,
        UUID approvedBy,
        OffsetDateTime approvedAt,
        String rejectionReason,
        OffsetDateTime createdAt
    ) {
        this(id, eventId, categoryId, benchmarkId, mediaAsset, itemName, quantity, unit,
             estUnitPrice, totalEstAmount, notes, approvalStatus, approvedBy, approvedAt,
             rejectionReason, createdAt, null);
    }
}