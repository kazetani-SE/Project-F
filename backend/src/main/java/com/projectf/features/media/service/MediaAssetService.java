package com.projectf.features.media.service;

import com.projectf.features.media.dto.request.CreateMediaAssetRequest;
import com.projectf.features.media.dto.request.MediaApprovalRequest;
import com.projectf.features.media.dto.request.UpdatePrintStatusRequest;
import com.projectf.features.media.dto.response.MediaAssetResponse;
import java.util.List;
import java.util.UUID;

public interface MediaAssetService {
    List<MediaAssetResponse> getMediaAssetsByEvent(UUID eventId, String assetType);

    MediaAssetResponse getMediaAssetById(UUID assetId);

    MediaAssetResponse createMediaAsset(UUID eventId, CreateMediaAssetRequest request);

    MediaAssetResponse updatePrintStatus(UUID assetId, UpdatePrintStatusRequest request);

    MediaAssetResponse updateApproval(UUID assetId, MediaApprovalRequest request);
}
