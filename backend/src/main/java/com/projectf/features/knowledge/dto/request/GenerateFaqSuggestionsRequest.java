package com.projectf.features.knowledge.dto.request;

import java.util.UUID;

public record GenerateFaqSuggestionsRequest(
        UUID eventId,
        String focusTopic,
        Integer count
) {
}
