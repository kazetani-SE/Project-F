package com.projectf.features.knowledge.dto.response;

import java.util.List;

public record FaqSuggestionsResultResponse(
        String modelUsed,
        String modelTier,
        String routingReason,
        List<FaqSuggestionItemResponse> suggestions
) {
}
