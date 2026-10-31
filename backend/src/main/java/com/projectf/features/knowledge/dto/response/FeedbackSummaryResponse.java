package com.projectf.features.knowledge.dto.response;

import java.util.Map;
import java.util.UUID;

public record FeedbackSummaryResponse(
        UUID eventId,
        long totalFeedbacks,
        double averageRating,
        Map<Integer, Long> ratingBreakdown
) {
}
