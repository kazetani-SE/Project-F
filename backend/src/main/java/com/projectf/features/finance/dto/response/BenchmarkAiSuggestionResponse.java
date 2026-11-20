package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;

public record BenchmarkAiSuggestionResponse(
                String itemName,
                String unit,
                BigDecimal estUnitPrice,
                String supplierName,
                String supplierLink,
                String referenceNote) {
}