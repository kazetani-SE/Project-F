package com.projectf.features.knowledge.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.common.response.PageResponse;
import com.projectf.features.knowledge.dto.request.*;
import com.projectf.features.knowledge.dto.response.*;
import com.projectf.features.knowledge.service.KnowledgeService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
public class KnowledgeController {
    private final KnowledgeService service;
    public KnowledgeController(final KnowledgeService service) { this.service = service; }
    @GetMapping("/events/{eventId}/documents")
    public ApiResponse<PageResponse<DocumentResponse>> documents(@PathVariable final UUID eventId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.documents(eventId, page, size));
    }
    @PostMapping("/events/{eventId}/documents")
    public ResponseEntity<ApiResponse<DocumentResponse>> createDocument(@PathVariable final UUID eventId,
            @Valid @RequestBody final DocumentRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createDocument(eventId, body)));
    }
    @PatchMapping("/events/{eventId}/documents/{documentId}/approval")
    public ApiResponse<DocumentResponse> approveDocument(@PathVariable final UUID eventId,
            @PathVariable final UUID documentId, @Valid @RequestBody final KnowledgeApprovalRequest body) {
        return ApiResponse.ok(service.approveDocument(eventId, documentId, body));
    }
    @GetMapping("/events/{eventId}/media-assets")
    public ApiResponse<PageResponse<MediaResponse>> media(@PathVariable final UUID eventId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.media(eventId, page, size));
    }
    @PostMapping("/events/{eventId}/media-assets")
    public ResponseEntity<ApiResponse<MediaResponse>> createMedia(@PathVariable final UUID eventId,
            @Valid @RequestBody final MediaRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createMedia(eventId, body)));
    }
    @PatchMapping("/events/{eventId}/media-assets/{assetId}/print-status")
    public ApiResponse<MediaResponse> printStatus(@PathVariable final UUID eventId,
            @PathVariable final UUID assetId, @Valid @RequestBody final PrintStatusRequest body) {
        return ApiResponse.ok(service.printStatus(eventId, assetId, body.isPrinted()));
    }
    @PatchMapping("/events/{eventId}/media-assets/{assetId}/approval")
    public ApiResponse<MediaResponse> approveMedia(@PathVariable final UUID eventId,
            @PathVariable final UUID assetId, @Valid @RequestBody final KnowledgeApprovalRequest body) {
        return ApiResponse.ok(service.approveMedia(eventId, assetId, body));
    }
    @GetMapping("/events/{eventId}/incidents")
    public ApiResponse<PageResponse<IncidentResponse>> incidents(@PathVariable final UUID eventId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.incidents(eventId, page, size));
    }
    @PostMapping("/events/{eventId}/incidents")
    public ResponseEntity<ApiResponse<IncidentResponse>> createIncident(@PathVariable final UUID eventId,
            @Valid @RequestBody final IncidentRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createIncident(eventId, body)));
    }
    @GetMapping("/event-series/{seriesId}/faqs")
    public ApiResponse<PageResponse<FaqResponse>> faqs(@PathVariable final UUID seriesId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.faqs(seriesId, page, size));
    }
    @PostMapping("/event-series/{seriesId}/faqs")
    public ResponseEntity<ApiResponse<FaqResponse>> createFaq(@PathVariable final UUID seriesId,
            @Valid @RequestBody final FaqRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createFaq(seriesId, body)));
    }
    @PatchMapping("/event-series/{seriesId}/faqs/{faqId}/pin")
    public ApiResponse<FaqResponse> pinFaq(@PathVariable final UUID seriesId,
            @PathVariable final UUID faqId, @Valid @RequestBody final PinRequest body) {
        return ApiResponse.ok(service.pinFaq(seriesId, faqId, body.isPinned()));
    }
    @GetMapping("/events/{eventId}/feedbacks")
    public ApiResponse<PageResponse<FeedbackResponse>> feedbacks(@PathVariable final UUID eventId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.feedbacks(eventId, page, size));
    }
    @GetMapping("/events/{eventId}/feedback-summary")
    public ApiResponse<FeedbackSummaryResponse> feedbackSummary(@PathVariable final UUID eventId) {
        return ApiResponse.ok(service.feedbackSummary(eventId));
    }
    @PostMapping("/events/{eventId}/feedbacks")
    public ResponseEntity<ApiResponse<FeedbackResponse>> createFeedback(@PathVariable final UUID eventId,
            @Valid @RequestBody final FeedbackRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createFeedback(eventId, body)));
    }
}
