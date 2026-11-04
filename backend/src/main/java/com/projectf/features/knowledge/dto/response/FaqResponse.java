package com.projectf.features.knowledge.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FaqResponse(
        UUID id,
        UUID seriesId,
        String question,
        String answer,
        String category,
        Boolean isPinned,
        OffsetDateTime updatedAt
) {
}
