package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record EventBudgetSummaryResponse(
    UUID eventId,
    String eventTitle,
    String seasonName,
    BigDecimal allocatedFund,
    BigDecimal totalBudgetEst,
    BigDecimal totalActualSpent,
    BigDecimal remainingFund,
    BigDecimal estimateVariance
) {}