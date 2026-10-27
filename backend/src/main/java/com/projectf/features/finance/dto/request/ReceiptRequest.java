package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ReceiptRequest(String receiptCode, @NotBlank String imageUrl,
        String supplierName) { }
