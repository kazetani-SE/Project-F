package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.security.AccessService;
import com.projectf.features.knowledge.dto.request.KnowledgeApprovalRequest;
import com.projectf.features.knowledge.entity.EventDocument;
import com.projectf.features.knowledge.mapper.KnowledgeMapper;
import com.projectf.features.knowledge.repository.EventDocumentRepository;
import com.projectf.features.knowledge.service.impl.KnowledgeServiceImpl;
import com.projectf.features.member.entity.ClubMember;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KnowledgeApprovalServiceTest {
    @Mock private EventDocumentRepository documentRepository;
    @Mock private AccessService access;
    @Mock private KnowledgeMapper mapper;
    @InjectMocks private KnowledgeServiceImpl service;

    @Test
    void rejectionRequiresReasonBeforeSaving() {
        final UUID eventId = UUID.randomUUID();
        final UUID documentId = UUID.randomUUID();
        final IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.approveDocument(eventId, documentId,
                        new KnowledgeApprovalRequest(ApprovalStatus.REJECTED, "  ")));
        assertEquals("VALIDATION_FAILED", error.getMessage());
        verify(documentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void approvalRecordsReviewerAndTime() {
        final UUID eventId = UUID.randomUUID();
        final UUID documentId = UUID.randomUUID();
        final EventDocument document = new EventDocument();
        final ClubMember reviewer = new ClubMember();
        when(documentRepository.findByIdAndEventId(documentId, eventId)).thenReturn(Optional.of(document));
        when(access.member()).thenReturn(reviewer);
        when(documentRepository.save(document)).thenReturn(document);
        service.approveDocument(eventId, documentId,
                new KnowledgeApprovalRequest(ApprovalStatus.APPROVED, null));
        assertEquals(ApprovalStatus.APPROVED, document.getStatus());
        assertEquals(reviewer, document.getApprovedBy());
        org.junit.jupiter.api.Assertions.assertNotNull(document.getApprovedAt());
    }
}
