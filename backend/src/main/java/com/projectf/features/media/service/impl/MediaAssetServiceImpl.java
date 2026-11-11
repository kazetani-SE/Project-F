package com.projectf.features.media.service.impl;

import com.projectf.features.media.dto.request.CreateMediaAssetRequest;
import com.projectf.features.media.dto.request.MediaApprovalRequest;
import com.projectf.features.media.dto.request.UpdatePrintStatusRequest;
import com.projectf.features.media.dto.response.MediaAssetResponse;
import com.projectf.features.media.entity.EventMediaAsset;
import com.projectf.features.media.mapper.MediaAssetMapper;
import com.projectf.features.media.repository.MediaAssetRepository;
import com.projectf.features.media.service.MediaAssetService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MediaAssetServiceImpl implements MediaAssetService {

    private static final Set<String> VALID_TYPES = Set.of(
            "POSTER",
            "BANNER",
            "STANDEE",
            "BACKDROP",
            "BADGE",
            "TRAILER",
            "SOCIAL_POST",
            "OTHER"
    );
    private static final String NOT_FOUND_MSG = "Không tìm thấy ấn phẩm với ID: ";

    private final MediaAssetRepository mediaRepo;
    private final MediaAssetMapper mediaMapper;

    public MediaAssetServiceImpl(MediaAssetRepository mediaRepo, MediaAssetMapper mediaMapper) {
        this.mediaRepo = mediaRepo;
        this.mediaMapper = mediaMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MediaAssetResponse> getMediaAssetsByEvent(UUID eventId, String assetType) {
        List<EventMediaAsset> assets;
        if (assetType != null && !assetType.isBlank()) {
            assets = mediaRepo.findByEventIdAndAssetTypeOrderByCreatedAtDesc(eventId, assetType);
        } else {
            assets = mediaRepo.findByEventIdOrderByCreatedAtDesc(eventId);
        }
        return assets.stream().map(mediaMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MediaAssetResponse getMediaAssetById(UUID assetId) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));
        return mediaMapper.toResponse(asset);
    }

    @Override
    @Transactional
    public MediaAssetResponse createMediaAsset(UUID eventId, CreateMediaAssetRequest request) {
        if (!VALID_TYPES.contains(request.assetType())) {
            throw new IllegalArgumentException("Loại ấn phẩm không hợp lệ: " + request.assetType());
        }
        EventMediaAsset entity = mediaMapper.toEntity(eventId, request);
        EventMediaAsset saved = mediaRepo.save(entity);
        return mediaMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public MediaAssetResponse updatePrintStatus(UUID assetId, UpdatePrintStatusRequest request) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        asset.setIsPrinted(request.isPrinted());
        EventMediaAsset updated = mediaRepo.save(asset);
        return mediaMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public MediaAssetResponse updateApproval(UUID assetId, MediaApprovalRequest request) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        asset.setApprovalStatus(request.approvalStatus());
        asset.setApprovedBy(request.approvedBy());
        EventMediaAsset updated = mediaRepo.save(asset);
        return mediaMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteMediaAsset(UUID assetId) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        if (Boolean.TRUE.equals(asset.getIsPrinted())) {
            throw new IllegalStateException("Không thể xóa ấn phẩm đã được in ấn");
        }

        mediaRepo.delete(asset);
    }
}
