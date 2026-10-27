package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BenchmarkResponse(UUID id, UUID categoryId, String itemName, String unit,
        BigDecimal currentMarketPrice, String supplierReference, Instant lastUpdatedAt) { }
