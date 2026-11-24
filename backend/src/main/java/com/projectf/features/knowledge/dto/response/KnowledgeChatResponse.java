package com.projectf.features.knowledge.dto.response;

import java.util.List;

public record KnowledgeChatResponse(
        String answer,
        String modelUsed,
        String modelTier,
        String routingReason,
        List<CitationItem> citations,
        List<String> followUpQuestions
) {
    public record CitationItem(
            String sourceType,
            String title,
            String snippet
    ) {
    }
}
