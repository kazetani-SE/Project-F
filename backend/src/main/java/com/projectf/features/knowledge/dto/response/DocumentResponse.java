package com.projectf.features.knowledge.dto.response;

import com.projectf.common.enums.ApprovalStatus;
import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(UUID id, UUID eventId, UUID parentDocumentId,
        String docType, String title, String version, String fileUrl, UUID uploadedBy,
        ApprovalStatus status, UUID approvedBy, Instant approvedAt, String rejectionReason,
        Instant createdAt, Instant updatedAt) { }
