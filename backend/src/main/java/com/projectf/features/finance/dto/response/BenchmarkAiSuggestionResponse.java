package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;

public record BenchmarkAiSuggestionResponse(
        String itemName,
        String unit,
        BigDecimal suggestedUnitPrice,
        String supplierName,
        String supplierLink,
        String referenceNote) {
}