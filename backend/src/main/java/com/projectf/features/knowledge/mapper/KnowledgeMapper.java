package com.projectf.features.knowledge.mapper;

import com.projectf.features.event.entity.Event;
import com.projectf.features.event.entity.EventSeries;
import com.projectf.features.knowledge.dto.request.*;
import com.projectf.features.knowledge.dto.response.*;
import com.projectf.features.knowledge.entity.*;
import com.projectf.features.member.entity.ClubMember;
import java.util.Arrays;
import org.springframework.stereotype.Component;

@Component
public class KnowledgeMapper {
    public DocumentResponse toResponse(final EventDocument item) {
        return new DocumentResponse(item.getId(), item.getEvent().getId(),
                item.getParentDocument() == null ? null : item.getParentDocument().getId(),
                item.getDocType(), item.getTitle(), item.getVersion(), item.getFileUrl(),
                item.getUploadedBy().getId(), item.getStatus(),
                item.getApprovedBy() == null ? null : item.getApprovedBy().getId(),
                item.getApprovedAt(), item.getRejectionReason(), item.getCreatedAt(), item.getUpdatedAt());
    }
    public MediaResponse toResponse(final EventMediaAsset item) {
        return new MediaResponse(item.getId(), item.getEvent().getId(), item.getAssetType(), item.getTitle(),
                item.getSpecifications(), item.getDesignFileUrl(), item.getPreviewImageUrl(), item.getIsPrinted(),
                item.getApprovalStatus(), item.getApprovedBy() == null ? null : item.getApprovedBy().getId(),
                item.getCreatedAt());
    }
    public IncidentResponse toResponse(final EventIncident item) {
        return new IncidentResponse(item.getId(), item.getEvent().getId(), item.getReportedBy().getId(),
                item.getTitle(), item.getSeverity(), Arrays.asList(item.getDepartmentInvolved()),
                item.getIncidentDescription(), item.getRootCause(), item.getImmediateSolution(),
                item.getLessonLearned(), item.getCreatedAt());
    }
    public FaqResponse toResponse(final EventFaq item) {
        return new FaqResponse(item.getId(), item.getSeries().getId(), item.getQuestion(), item.getAnswer(),
                item.getCategory(), item.getIsPinned(), item.getUpdatedAt());
    }
    public FeedbackResponse toResponse(final EventFeedback item) {
        return new FeedbackResponse(item.getId(), item.getEvent().getId(), item.getSourceType(), item.getFileUrl(),
                item.getRatingScore(), item.getHighlightContent(), item.getImprovementContent(),
                item.getCustomResponses(), item.getSubmittedAt());
    }
    public EventDocument create(final DocumentRequest request, final Event event,
            final EventDocument parent, final ClubMember uploader) {
        final EventDocument item = new EventDocument();
        item.setEvent(event); item.setParentDocument(parent); item.setDocType(request.docType());
        item.setTitle(request.title()); item.setVersion(request.version());
        item.setFileUrl(request.fileUrl()); item.setUploadedBy(uploader);
        return item;
    }
    public EventMediaAsset create(final MediaRequest request, final Event event) {
        final EventMediaAsset item = new EventMediaAsset();
        item.setEvent(event); item.setAssetType(request.assetType()); item.setTitle(request.title());
        item.setSpecifications(request.specifications()); item.setDesignFileUrl(request.designFileUrl());
        item.setPreviewImageUrl(request.previewImageUrl());
        return item;
    }
    public EventIncident create(final IncidentRequest request, final Event event,
            final ClubMember reporter) {
        final EventIncident item = new EventIncident();
        item.setEvent(event); item.setReportedBy(reporter); item.setTitle(request.title());
        item.setSeverity(request.severity());
        item.setDepartmentInvolved(request.departmentInvolved().toArray(com.projectf.common.enums.Department[]::new));
        item.setIncidentDescription(request.incidentDescription()); item.setRootCause(request.rootCause());
        item.setImmediateSolution(request.immediateSolution()); item.setLessonLearned(request.lessonLearned());
        return item;
    }
    public EventFaq create(final FaqRequest request, final EventSeries series) {
        final EventFaq item = new EventFaq();
        item.setSeries(series); item.setQuestion(request.question()); item.setAnswer(request.answer());
        item.setCategory(request.category()); item.setIsPinned(request.isPinned());
        return item;
    }
    public EventFeedback create(final FeedbackRequest request, final Event event) {
        final EventFeedback item = new EventFeedback();
        item.setEvent(event); item.setSourceType(request.sourceType()); item.setFileUrl(request.fileUrl());
        item.setRatingScore(request.ratingScore()); item.setHighlightContent(request.highlightContent());
        item.setImprovementContent(request.improvementContent()); item.setCustomResponses(request.customResponses());
        return item;
    }
}
