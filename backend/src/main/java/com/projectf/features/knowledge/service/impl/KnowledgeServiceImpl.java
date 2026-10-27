package com.projectf.features.knowledge.service.impl;

import com.projectf.common.StorageReference;
import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.response.PageResponse;
import com.projectf.common.security.AccessService;
import com.projectf.features.event.service.EventService;
import com.projectf.features.knowledge.dto.request.*;
import com.projectf.features.knowledge.dto.response.*;
import com.projectf.features.knowledge.entity.*;
import com.projectf.features.knowledge.mapper.KnowledgeMapper;
import com.projectf.features.knowledge.repository.*;
import com.projectf.features.knowledge.service.KnowledgeService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class KnowledgeServiceImpl implements KnowledgeService {
    private final EventDocumentRepository documentRepository;
    private final EventMediaAssetRepository mediaRepository;
    private final EventIncidentRepository incidentRepository;
    private final EventFaqRepository faqRepository;
    private final EventFeedbackRepository feedbackRepository;
    private final EventService eventService;
    private final AccessService access;
    private final StorageReference storage;
    private final KnowledgeMapper mapper;
    private final EntityManager entityManager;

    public KnowledgeServiceImpl(final EventDocumentRepository documentRepository,
            final EventMediaAssetRepository mediaRepository, final EventIncidentRepository incidentRepository,
            final EventFaqRepository faqRepository, final EventFeedbackRepository feedbackRepository,
            final EventService eventService, final AccessService access, final StorageReference storage,
            final KnowledgeMapper mapper, final EntityManager entityManager) {
        this.documentRepository = documentRepository;
        this.mediaRepository = mediaRepository;
        this.incidentRepository = incidentRepository;
        this.faqRepository = faqRepository;
        this.feedbackRepository = feedbackRepository;
        this.eventService = eventService;
        this.access = access;
        this.storage = storage;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Override public PageResponse<DocumentResponse> documents(final UUID eventId, final int page, final int size) {
        eventService.requireEvent(eventId);
        final Page<EventDocument> data = documentRepository.findByEventId(eventId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }
    @Override @Transactional public DocumentResponse createDocument(final UUID eventId,
            final DocumentRequest request) {
        access.requireOrganizer(eventId);
        storage.require("DOCUMENT", request.fileUrl());
        final EventDocument parent = request.parentDocumentId() == null ? null : documentRepository
                .findByIdAndEventId(request.parentDocumentId(), eventId).orElseThrow(NoSuchElementException::new);
        final EventDocument item = mapper.create(request, eventService.requireEvent(eventId), parent, access.member());
        item.setStatus(ApprovalStatus.DRAFT);
        documentRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }
    @Override @Transactional public DocumentResponse approveDocument(final UUID eventId, final UUID documentId,
            final KnowledgeApprovalRequest request) {
        access.requireEventLead(eventId);
        validateDecision(request);
        final EventDocument item = documentRepository.findByIdAndEventId(documentId, eventId)
                .orElseThrow(NoSuchElementException::new);
        item.setStatus(request.status()); item.setApprovedBy(access.member()); item.setApprovedAt(Instant.now());
        item.setRejectionReason(request.status() == ApprovalStatus.REJECTED ? request.rejectionReason() : null);
        return mapper.toResponse(documentRepository.save(item));
    }
    @Override public PageResponse<MediaResponse> media(final UUID eventId, final int page, final int size) {
        eventService.requireEvent(eventId);
        final Page<EventMediaAsset> data = mediaRepository.findByEventId(eventId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }
    @Override @Transactional public MediaResponse createMedia(final UUID eventId, final MediaRequest request) {
        access.requireOrganizer(eventId);
        if (request.designFileUrl() != null) storage.require("MEDIA", request.designFileUrl());
        if (request.previewImageUrl() != null) storage.require("MEDIA", request.previewImageUrl());
        final EventMediaAsset item = mapper.create(request, eventService.requireEvent(eventId));
        item.setApprovalStatus(ApprovalStatus.DRAFT);
        mediaRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }
    @Override @Transactional public MediaResponse printStatus(final UUID eventId, final UUID assetId,
            final boolean printed) {
        access.requireMediaLead(eventId);
        final EventMediaAsset item = mediaRepository.findByIdAndEventId(assetId, eventId)
                .orElseThrow(NoSuchElementException::new);
        item.setIsPrinted(printed);
        return mapper.toResponse(mediaRepository.save(item));
    }
    @Override @Transactional public MediaResponse approveMedia(final UUID eventId, final UUID assetId,
            final KnowledgeApprovalRequest request) {
        access.requireEventLead(eventId);
        validateDecision(request);
        final EventMediaAsset item = mediaRepository.findByIdAndEventId(assetId, eventId)
                .orElseThrow(NoSuchElementException::new);
        item.setApprovalStatus(request.status()); item.setApprovedBy(access.member());
        return mapper.toResponse(mediaRepository.save(item));
    }
    @Override public PageResponse<IncidentResponse> incidents(final UUID eventId, final int page, final int size) {
        eventService.requireEvent(eventId);
        final Page<EventIncident> data = incidentRepository.findByEventId(eventId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }
    @Override @Transactional public IncidentResponse createIncident(final UUID eventId,
            final IncidentRequest request) {
        access.requireOrganizer(eventId);
        final EventIncident item = mapper.create(request, eventService.requireEvent(eventId), access.member());
        incidentRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }
    @Override public PageResponse<FaqResponse> faqs(final UUID seriesId, final int page, final int size) {
        eventService.requireSeries(seriesId);
        final Page<EventFaq> data = faqRepository.findBySeriesId(seriesId,
                PageRequest.of(page, size, Sort.by("isPinned").descending().and(Sort.by("updatedAt").descending())));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }
    @Override @Transactional public FaqResponse createFaq(final UUID seriesId, final FaqRequest request) {
        access.requireClubAdmin();
        final EventFaq item = mapper.create(request, eventService.requireSeries(seriesId));
        faqRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }
    @Override @Transactional public FaqResponse pinFaq(final UUID seriesId, final UUID faqId,
            final boolean pinned) {
        access.requireClubAdmin();
        final EventFaq item = faqRepository.findByIdAndSeriesId(faqId, seriesId)
                .orElseThrow(NoSuchElementException::new);
        item.setIsPinned(pinned);
        return mapper.toResponse(faqRepository.save(item));
    }
    @Override public PageResponse<FeedbackResponse> feedbacks(final UUID eventId, final int page, final int size) {
        access.requireOrganizer(eventId);
        eventService.requireEvent(eventId);
        final Page<EventFeedback> data = feedbackRepository.findByEventId(eventId,
                PageRequest.of(page, size, Sort.by("submittedAt").descending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }
    @Override @Transactional public FeedbackResponse createFeedback(final UUID eventId,
            final FeedbackRequest request) {
        storage.require("FEEDBACK", request.fileUrl());
        final EventFeedback item = mapper.create(request, eventService.requireEvent(eventId));
        feedbackRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }
    @Override public FeedbackSummaryResponse feedbackSummary(final UUID eventId) {
        access.requireOrganizer(eventId);
        eventService.requireEvent(eventId);
        final Double average = feedbackRepository.averageRating(eventId);
        return new FeedbackSummaryResponse(feedbackRepository.countByEventId(eventId),
                average == null ? null : BigDecimal.valueOf(average));
    }
    @Override public EventMediaAsset requireMedia(final UUID id) {
        return mediaRepository.findById(id).orElseThrow(NoSuchElementException::new);
    }
    private void validateDecision(final KnowledgeApprovalRequest request) {
        if (request.status() != ApprovalStatus.APPROVED && request.status() != ApprovalStatus.REJECTED) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        if (request.status() == ApprovalStatus.REJECTED && (request.rejectionReason() == null
                || request.rejectionReason().isBlank())) throw new IllegalArgumentException("VALIDATION_FAILED");
    }
}
