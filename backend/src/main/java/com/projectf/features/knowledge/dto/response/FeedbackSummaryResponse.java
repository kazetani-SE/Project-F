package com.projectf.features.knowledge.dto.response;

import java.math.BigDecimal;

public record FeedbackSummaryResponse(long responseCount, BigDecimal averageRating) { }
