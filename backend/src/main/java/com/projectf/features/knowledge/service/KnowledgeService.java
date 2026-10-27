package com.projectf.features.knowledge.service;

import com.projectf.common.response.PageResponse;
import com.projectf.features.knowledge.dto.request.*;
import com.projectf.features.knowledge.dto.response.*;
import com.projectf.features.knowledge.entity.EventMediaAsset;
import java.util.UUID;

public interface KnowledgeService {
    PageResponse<DocumentResponse> documents(UUID eventId, int page, int size);
    DocumentResponse createDocument(UUID eventId, DocumentRequest request);
    DocumentResponse approveDocument(UUID eventId, UUID documentId, KnowledgeApprovalRequest request);
    PageResponse<MediaResponse> media(UUID eventId, int page, int size);
    MediaResponse createMedia(UUID eventId, MediaRequest request);
    MediaResponse printStatus(UUID eventId, UUID assetId, boolean printed);
    MediaResponse approveMedia(UUID eventId, UUID assetId, KnowledgeApprovalRequest request);
    PageResponse<IncidentResponse> incidents(UUID eventId, int page, int size);
    IncidentResponse createIncident(UUID eventId, IncidentRequest request);
    PageResponse<FaqResponse> faqs(UUID seriesId, int page, int size);
    FaqResponse createFaq(UUID seriesId, FaqRequest request);
    FaqResponse pinFaq(UUID seriesId, UUID faqId, boolean pinned);
    PageResponse<FeedbackResponse> feedbacks(UUID eventId, int page, int size);
    FeedbackResponse createFeedback(UUID eventId, FeedbackRequest request);
    FeedbackSummaryResponse feedbackSummary(UUID eventId);
    EventMediaAsset requireMedia(UUID id);
}
