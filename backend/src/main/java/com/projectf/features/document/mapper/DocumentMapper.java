package com.projectf.features.document.mapper;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.document.dto.request.CreateDocumentRequest;
import com.projectf.features.document.dto.response.DocumentResponse;
import com.projectf.features.document.entity.EventDocument;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class DocumentMapper {

    public EventDocument toEntity(UUID eventId, CreateDocumentRequest request) {
        EventDocument document = new EventDocument();
        document.setEventId(eventId);
        document.setParentDocumentId(request.parentDocumentId());
        document.setDocType(request.docType());
        document.setTitle(request.title());
        document.setVersion(request.version() == null || request.version().isBlank() ? "1.0" : request.version());
        document.setFileUrl(request.fileUrl());
        document.setUploadedBy(request.uploadedBy());
        document.setStatus(ApprovalStatus.PENDING);
        return document;
    }

    public DocumentResponse toResponse(EventDocument entity) {
        return new DocumentResponse(
                entity.getId(),
                entity.getEventId(),
                entity.getParentDocumentId(),
                entity.getDocType(),
                entity.getTitle(),
                entity.getVersion(),
                entity.getFileUrl(),
                entity.getUploadedBy(),
                entity.getStatus(),
                entity.getApprovedBy(),
                entity.getApprovedAt(),
                entity.getRejectionReason(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
