package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.UUID;

public record BudgetItemRequest(@NotNull UUID categoryId, UUID benchmarkId,
        @NotBlank String itemName, UUID mediaAsset, @NotNull @Positive BigDecimal quantity,
        @NotBlank String unit, @NotNull @PositiveOrZero BigDecimal estimatedUnitPrice,
        String notes) { }
