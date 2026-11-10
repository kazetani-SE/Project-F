package com.projectf.features.knowledge.dto.response;

public record FaqSuggestionItemResponse(
        String question,
        String category,
        String rationale,
        String answerHint
) {
}
