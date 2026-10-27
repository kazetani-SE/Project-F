package com.projectf.features.knowledge.dto.response;

import com.projectf.common.enums.ApprovalStatus;
import java.time.Instant;
import java.util.UUID;

public record MediaResponse(UUID id, UUID eventId, String assetType, String title,
        String specifications, String designFileUrl, String previewImageUrl, Boolean isPrinted,
        ApprovalStatus approvalStatus, UUID approvedBy, Instant createdAt) { }
