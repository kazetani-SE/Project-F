package com.projectf.features.media.mapper;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.media.dto.request.CreateMediaAssetRequest;
import com.projectf.features.media.dto.response.MediaAssetResponse;
import com.projectf.features.media.entity.EventMediaAsset;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class MediaAssetMapper {

    public EventMediaAsset toEntity(UUID eventId, CreateMediaAssetRequest request) {
        EventMediaAsset asset = new EventMediaAsset();
        asset.setEventId(eventId);
        asset.setAssetType(request.assetType());
        asset.setTitle(request.title());
        asset.setSpecifications(request.specifications());
        asset.setDesignFileUrl(request.designFileUrl());
        asset.setPreviewImageUrl(request.previewImageUrl());
        asset.setIsPrinted(false);
        asset.setApprovalStatus(ApprovalStatus.PENDING);
        return asset;
    }

    public MediaAssetResponse toResponse(EventMediaAsset entity) {
        return new MediaAssetResponse(
                entity.getId(),
                entity.getEventId(),
                entity.getAssetType(),
                entity.getTitle(),
                entity.getSpecifications(),
                entity.getDesignFileUrl(),
                entity.getPreviewImageUrl(),
                entity.getIsPrinted(),
                entity.getApprovalStatus(),
                entity.getApprovedBy(),
                entity.getCreatedAt()
        );
    }
}
