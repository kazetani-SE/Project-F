package com.projectf.features.knowledge.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.knowledge.dto.request.DraftIncidentAiRequest;
import com.projectf.features.knowledge.dto.request.GenerateFaqSuggestionsRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest;
import com.projectf.features.knowledge.dto.response.DraftIncidentAiResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionsResultResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse;
import com.projectf.features.knowledge.service.KnowledgeAiService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class KnowledgeAiController {

    private static final String EVENT_ID_PARAM = "eventId";

    private final KnowledgeAiService aiService;

    public KnowledgeAiController(KnowledgeAiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/events/{eventId}/feedbacks/ai-report")
    public ResponseEntity<ApiResponse<FeedbackAiReportResponse>> getSavedFeedbackReport(
            @PathVariable(EVENT_ID_PARAM) UUID eventId
    ) {
        FeedbackAiReportResponse report = aiService.getSavedFeedbackReport(eventId).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @PostMapping("/events/{eventId}/feedbacks/ai-report")
    public ResponseEntity<ApiResponse<FeedbackAiReportResponse>> generateFeedbackReport(
            @PathVariable(EVENT_ID_PARAM) UUID eventId
    ) {
        FeedbackAiReportResponse report = aiService.generateFeedbackReport(eventId);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @PostMapping("/event-series/{seriesId}/faqs/ai-suggest")
    public ResponseEntity<ApiResponse<FaqSuggestionsResultResponse>> suggestFaqQuestions(
            @PathVariable("seriesId") UUID seriesId,
            @RequestBody(required = false) GenerateFaqSuggestionsRequest request
    ) {
        GenerateFaqSuggestionsRequest safeReq = request == null
                ? new GenerateFaqSuggestionsRequest(null, null, 5)
                : request;
        FaqSuggestionsResultResponse result = aiService.suggestFaqQuestions(seriesId, safeReq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/events/{eventId}/incidents/ai-draft")
    public ResponseEntity<ApiResponse<DraftIncidentAiResponse>> draftIncidentPostMortem(
            @PathVariable(EVENT_ID_PARAM) UUID eventId,
            @Valid @RequestBody DraftIncidentAiRequest request
    ) {
        DraftIncidentAiResponse draft = aiService.draftIncidentPostMortem(eventId, request);
        return ResponseEntity.ok(ApiResponse.ok(draft));
    }

    @PostMapping("/events/{eventId}/knowledge/ai-chat")
    public ResponseEntity<ApiResponse<KnowledgeChatResponse>> chatWithKnowledgeBase(
            @PathVariable(EVENT_ID_PARAM) UUID eventId,
            @Valid @RequestBody KnowledgeChatRequest request
    ) {
        KnowledgeChatResponse chatResponse = aiService.chatWithKnowledgeBase(eventId, request);
        return ResponseEntity.ok(ApiResponse.ok(chatResponse));
    }
}
