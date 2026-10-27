package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record BenchmarkUpdateRequest(String itemName, String unit,
        @PositiveOrZero BigDecimal currentMarketPrice, String supplierReference) { }
