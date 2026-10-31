package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import com.projectf.features.document.dto.request.DocumentApprovalRequest;
import com.projectf.features.document.dto.response.DocumentResponse;
import com.projectf.features.document.entity.EventDocument;
import com.projectf.features.document.mapper.DocumentMapper;
import com.projectf.features.document.repository.DocumentRepository;
import com.projectf.features.document.service.impl.DocumentServiceImpl;
import com.projectf.features.knowledge.dto.request.CreateIncidentRequest;
import com.projectf.features.knowledge.dto.response.FeedbackSummaryResponse;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.entity.EventIncident;
import com.projectf.features.knowledge.mapper.FeedbackMapper;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.service.impl.FeedbackServiceImpl;
import com.projectf.features.media.dto.request.UpdatePrintStatusRequest;
import com.projectf.features.media.entity.EventMediaAsset;
import com.projectf.features.media.mapper.MediaAssetMapper;
import com.projectf.features.media.repository.MediaAssetRepository;
import com.projectf.features.media.service.impl.MediaAssetServiceImpl;
import jakarta.persistence.Table;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class DocumentMediaKnowledgeTest {

    @Test
    void documentApprovalRequiresRejectionReasonWhenRejected() {
        DocumentRepository docRepo = Mockito.mock(DocumentRepository.class);
        DocumentMapper mapper = new DocumentMapper();
        DocumentServiceImpl service = new DocumentServiceImpl(docRepo, mapper);

        UUID docId = UUID.randomUUID();
        EventDocument doc = new EventDocument();
        doc.setId(docId);
        doc.setEventId(UUID.randomUUID());
        doc.setStatus(ApprovalStatus.PENDING);

        when(docRepo.findById(docId)).thenReturn(Optional.of(doc));

        DocumentApprovalRequest invalidReq = new DocumentApprovalRequest(
                ApprovalStatus.REJECTED,
                UUID.randomUUID(),
                "   "
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateApproval(docId, invalidReq)
        );
        assertTrue(ex.getMessage().contains("lý do từ chối"));

        DocumentApprovalRequest validReq = new DocumentApprovalRequest(
                ApprovalStatus.REJECTED,
                UUID.randomUUID(),
                "Kế hoạch chưa rõ ngân sách"
        );
        when(docRepo.save(any(EventDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentResponse response = service.updateApproval(docId, validReq);
        assertEquals(ApprovalStatus.REJECTED, response.status());
        assertEquals("Kế hoạch chưa rõ ngân sách", response.rejectionReason());
        assertNotNull(response.approvedAt());
    }

    @Test
    void mediaAssetUpdatesPrintStatus() {
        MediaAssetRepository mediaRepo = Mockito.mock(MediaAssetRepository.class);
        MediaAssetMapper mapper = new MediaAssetMapper();
        MediaAssetServiceImpl service = new MediaAssetServiceImpl(mediaRepo, mapper);

        UUID assetId = UUID.randomUUID();
        EventMediaAsset asset = new EventMediaAsset();
        asset.setId(assetId);
        asset.setIsPrinted(false);

        when(mediaRepo.findById(assetId)).thenReturn(Optional.of(asset));
        when(mediaRepo.save(any(EventMediaAsset.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.updatePrintStatus(assetId, new UpdatePrintStatusRequest(true));
        assertTrue(response.isPrinted());
    }

    @Test
    void incidentValidationEnforcesPostMortemFields() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();

            CreateIncidentRequest emptyRequest = new CreateIncidentRequest(
                    null,
                    "",
                    null,
                    List.of(),
                    "",
                    "",
                    "",
                    ""
            );
            var violations = validator.validate(emptyRequest);
            assertFalse(violations.isEmpty());

            CreateIncidentRequest validRequest = new CreateIncidentRequest(
                    UUID.randomUUID(),
                    "Mất mạng phòng thi",
                    IncidentSeverity.CRITICAL,
                    List.of(Department.HR, Department.PLAN),
                    "Đứt cáp quang",
                    "Không có đường dự phòng",
                    "Bật phát wifi 4G",
                    "Cần 2 đường truyền"
            );
            assertTrue(validator.validate(validRequest).isEmpty());
        }
    }

    @Test
    void feedbackSummaryCalculatesAverageAndBreakdownAccurately() {
        FeedbackRepository feedbackRepo = Mockito.mock(FeedbackRepository.class);
        FeedbackMapper mapper = new FeedbackMapper();
        FeedbackServiceImpl service = new FeedbackServiceImpl(feedbackRepo, mapper);

        UUID eventId = UUID.randomUUID();

        // 1. Khi chưa có feedback
        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(List.of());
        FeedbackSummaryResponse emptySummary = service.getFeedbackSummaryByEvent(eventId);
        assertEquals(0, emptySummary.totalFeedbacks());
        assertEquals(0.0, emptySummary.averageRating());
        assertEquals(0L, emptySummary.ratingBreakdown().get(5));

        // 2. Khi có các feedbacks: 5, 4, 5
        EventFeedback fb1 = new EventFeedback();
        fb1.setRatingScore(5);
        EventFeedback fb2 = new EventFeedback();
        fb2.setRatingScore(4);
        EventFeedback fb3 = new EventFeedback();
        fb3.setRatingScore(5);

        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(List.of(fb1, fb2, fb3));
        FeedbackSummaryResponse summary = service.getFeedbackSummaryByEvent(eventId);
        assertEquals(3, summary.totalFeedbacks());
        assertEquals(4.67, summary.averageRating());
        assertEquals(2L, summary.ratingBreakdown().get(5));
        assertEquals(1L, summary.ratingBreakdown().get(4));
        assertEquals(0L, summary.ratingBreakdown().get(1));
    }

    @Test
    void entitiesMapCorrectDatabaseTableNames() {
        assertEquals("event_documents", EventDocument.class.getAnnotation(Table.class).name());
        assertEquals("event_media_assets", EventMediaAsset.class.getAnnotation(Table.class).name());
        assertEquals("event_incidents", EventIncident.class.getAnnotation(Table.class).name());
        assertEquals("event_feedbacks", EventFeedback.class.getAnnotation(Table.class).name());
    }
}
