package com.projectf.features.knowledge.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.knowledge.dto.request.CreateFeedbackRequest;
import com.projectf.features.knowledge.dto.response.FeedbackResponse;
import com.projectf.features.knowledge.dto.response.FeedbackSummaryResponse;
import com.projectf.features.knowledge.service.FeedbackService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping("/events/{eventId}/feedbacks")
    public ResponseEntity<ApiResponse<List<FeedbackResponse>>> getFeedbacks(
            @PathVariable("eventId") UUID eventId
    ) {
        List<FeedbackResponse> response = feedbackService.getFeedbacksByEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/events/{eventId}/feedbacks/summary")
    public ResponseEntity<ApiResponse<FeedbackSummaryResponse>> getFeedbackSummary(
            @PathVariable("eventId") UUID eventId
    ) {
        FeedbackSummaryResponse response = feedbackService.getFeedbackSummaryByEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/events/{eventId}/feedbacks")
    public ResponseEntity<ApiResponse<FeedbackResponse>> submitFeedback(
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody CreateFeedbackRequest request
    ) {
        FeedbackResponse response = feedbackService.submitFeedback(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping("/events/{eventId}/feedbacks/batch")
    public ResponseEntity<ApiResponse<List<FeedbackResponse>>> submitFeedbacksBatch(
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody List<CreateFeedbackRequest> requests
    ) {
        List<FeedbackResponse> response = feedbackService.submitFeedbacksBatch(eventId, requests);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }
}
