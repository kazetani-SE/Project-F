package com.projectf.features.knowledge.service;

import com.projectf.features.knowledge.dto.request.DraftIncidentAiRequest;
import com.projectf.features.knowledge.dto.request.GenerateFaqSuggestionsRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest;
import com.projectf.features.knowledge.dto.response.DraftIncidentAiResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionsResultResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse;
import java.util.Optional;
import java.util.UUID;

public interface KnowledgeAiService {

    Optional<FeedbackAiReportResponse> getSavedFeedbackReport(UUID eventId);

    FeedbackAiReportResponse generateFeedbackReport(UUID eventId);

    FaqSuggestionsResultResponse suggestFaqQuestions(UUID seriesId, GenerateFaqSuggestionsRequest request);

    DraftIncidentAiResponse draftIncidentPostMortem(UUID eventId, DraftIncidentAiRequest request);

    KnowledgeChatResponse chatWithKnowledgeBase(UUID eventId, KnowledgeChatRequest request);
}
