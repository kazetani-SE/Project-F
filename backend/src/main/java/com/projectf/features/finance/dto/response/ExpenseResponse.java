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
        List<ExpenseReceiptResponse> receipts,
        /** Chỉ có ở get detail; null ở các endpoint khác hoặc khi là chi phát sinh. */
        LinkedBudgetItem budgetItem) {

    /** Hạng mục dự trù đi kèm khoản chi, để FE so sánh dự trù với thực chi. */
    public record LinkedBudgetItem(
            UUID id,
            String itemName,
            String unit,
            BigDecimal quantity,
            BigDecimal estUnitPrice,
            BigDecimal estTotal,
            ApprovalStatus approvalStatus) {
    }
}