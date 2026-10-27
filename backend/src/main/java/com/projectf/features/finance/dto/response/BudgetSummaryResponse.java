package com.projectf.features.finance.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record BudgetSummaryResponse(UUID eventId, String eventTitle, String seasonName,
        BigDecimal allocatedFund, BigDecimal totalBudgetEstimated,
        BigDecimal totalActualSpent, BigDecimal remainingAllocatedFund,
        BigDecimal varianceAgainstEstimate) { }
