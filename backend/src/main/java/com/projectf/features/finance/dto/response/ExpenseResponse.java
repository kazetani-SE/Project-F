package com.projectf.features.finance.dto.response;

import com.projectf.common.enums.ApprovalStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(UUID id, UUID eventId, UUID budgetItemId, String itemName,
        BigDecimal quantity, BigDecimal actualUnitPrice, BigDecimal totalAmount,
        UUID paidBy, ApprovalStatus status, UUID approvedBy, Instant approvedAt,
        String rejectionReason, LocalDate paymentDate, String notes, Instant createdAt,
        List<ReceiptResponse> receipts) { }
