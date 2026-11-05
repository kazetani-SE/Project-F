package com.projectf.features.document.dto.response;

import com.projectf.common.enums.ApprovalStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID eventId,
        UUID parentDocumentId,
        String docType,
        String title,
        String version,
        String fileUrl,
        UUID uploadedBy,
        ApprovalStatus status,
        UUID approvedBy,
        OffsetDateTime approvedAt,
        String rejectionReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
