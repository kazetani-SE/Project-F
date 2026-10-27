package com.projectf.features.knowledge.dto.response;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record FeedbackResponse(UUID id, UUID eventId, String sourceType, String fileUrl,
        Integer ratingScore, String highlightContent, String improvementContent,
        Map<String, Object> customResponses, Instant submittedAt) { }
