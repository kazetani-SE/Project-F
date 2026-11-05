package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ProjectedBudgetResponse(
    UUID prevBudgetItemId,
    UUID previousEventId,
    UUID categoryId,
    UUID benchmarkId,
    String itemName,
    String unit,
    BigDecimal prevPlannedQty,
    BigDecimal baseProjectionQty,
    BigDecimal previousUnitPrice,
    BigDecimal adjustedUnitPrice,
    BigDecimal projectedCost
) {}