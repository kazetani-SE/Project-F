package com.projectf.features.media.dto.response;

import com.projectf.common.enums.ApprovalStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MediaAssetResponse(
        UUID id,
        UUID eventId,
        String assetType,
        String title,
        String specifications,
        String designFileUrl,
        String previewImageUrl,
        Boolean isPrinted,
        ApprovalStatus approvalStatus,
        UUID approvedBy,
        OffsetDateTime createdAt
) {
}
