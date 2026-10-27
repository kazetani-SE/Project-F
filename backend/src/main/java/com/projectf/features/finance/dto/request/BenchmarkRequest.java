package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.UUID;

public record BenchmarkRequest(@NotNull UUID categoryId, @NotBlank String itemName,
        @NotBlank String unit, @NotNull @PositiveOrZero BigDecimal currentMarketPrice,
        String supplierReference) { }
