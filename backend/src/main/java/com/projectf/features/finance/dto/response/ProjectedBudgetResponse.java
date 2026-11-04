package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ProjectedBudgetResponse(
    UUID previousBudgetItemId,
    UUID previousEventId,
    UUID categoryId,
    UUID benchmarkId,
    String itemName,
    String unit,
    BigDecimal previousPlannedQty,
    BigDecimal baseQuantityForProjection,
    BigDecimal previousUnitPrice,
    BigDecimal currentAdjustedUnitPrice,
    BigDecimal projectedCurrentCost
) {}

