package com.projectf.features.finance.dto.response;

import com.projectf.common.enums.ApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(
    UUID id,
    UUID eventId,
    UUID budgetItemId,
    String itemName,
    BigDecimal quantity,
    BigDecimal actualUnitPrice,
    BigDecimal totalAmount,
    UUID paidBy,
    ApprovalStatus status,
    UUID approvedBy,
    OffsetDateTime approvedAt,
    String rejectionReason,
    LocalDate paymentDate,
    String notes,
    OffsetDateTime createdAt,
    List<ExpenseReceiptResponse> receipts
) {}

