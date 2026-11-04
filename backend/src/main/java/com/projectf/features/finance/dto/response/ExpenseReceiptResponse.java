package com.projectf.features.finance.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ExpenseReceiptResponse(
    UUID id,
    UUID expenseId,
    String receiptCode,
    String imageUrl,
    String supplierName,
    OffsetDateTime createdAt
) {}

