package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record BenchmarkResponse(
    UUID id,
    UUID categoryId,
    String itemName,
    String unit,
    BigDecimal curMarketPrice,
    String supplierReference,
    OffsetDateTime lastUpdatedAt
) {}