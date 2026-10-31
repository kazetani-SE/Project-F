package com.projectf.features.knowledge.dto.response;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record FeedbackResponse(
        UUID id,
        UUID eventId,
        String sourceType,
        String fileUrl,
        Integer ratingScore,
        String highlightContent,
        String improveContent,
        Map<String, Object> customResponses,
        OffsetDateTime submittedAt
) {
}
