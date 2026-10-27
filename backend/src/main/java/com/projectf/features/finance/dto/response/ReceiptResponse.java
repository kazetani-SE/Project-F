package com.projectf.features.finance.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ReceiptResponse(UUID id, UUID expenseId, String receiptCode,
        String imageUrl, String supplierName, Instant createdAt) { }
