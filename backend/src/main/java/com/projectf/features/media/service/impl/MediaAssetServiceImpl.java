package com.projectf.features.media.service.impl;

import com.projectf.features.media.dto.request.CreateMediaAssetRequest;
import com.projectf.features.media.dto.request.MediaApprovalRequest;
import com.projectf.features.media.dto.request.UpdatePrintStatusRequest;
import com.projectf.features.media.dto.response.MediaAssetResponse;
import com.projectf.features.media.entity.EventMediaAsset;
import com.projectf.features.media.mapper.MediaAssetMapper;
import com.projectf.features.media.repository.MediaAssetRepository;
import com.projectf.features.media.service.MediaAssetService;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.service.StorageService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MediaAssetServiceImpl implements MediaAssetService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaAssetServiceImpl.class);

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
    private final StorageService storageService;

    @Autowired
    public MediaAssetServiceImpl(MediaAssetRepository mediaRepo, MediaAssetMapper mediaMapper, StorageService storageService) {
        this.mediaRepo = mediaRepo;
        this.mediaMapper = mediaMapper;
        this.storageService = storageService;
    }

    public MediaAssetServiceImpl(MediaAssetRepository mediaRepo, MediaAssetMapper mediaMapper) {
        this(mediaRepo, mediaMapper, null);
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
        return assets.stream().map(this::enrichResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MediaAssetResponse getMediaAssetById(UUID assetId) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));
        return enrichResponse(asset);
    }

    @Override
    @Transactional
    public MediaAssetResponse createMediaAsset(UUID eventId, CreateMediaAssetRequest request) {
        if (!VALID_TYPES.contains(request.assetType())) {
            throw new IllegalArgumentException("Loại ấn phẩm không hợp lệ: " + request.assetType());
        }
        EventMediaAsset entity = mediaMapper.toEntity(eventId, request);
        EventMediaAsset saved = mediaRepo.save(entity);
        return enrichResponse(saved);
    }

    @Override
    @Transactional
    public MediaAssetResponse updateMediaAsset(UUID assetId, CreateMediaAssetRequest request) {
        if (!VALID_TYPES.contains(request.assetType())) {
            throw new IllegalArgumentException("Loại ấn phẩm không hợp lệ: " + request.assetType());
        }
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        mediaMapper.updateEntity(asset, request);
        EventMediaAsset updated = mediaRepo.save(asset);
        return enrichResponse(updated);
    }

    @Override
    @Transactional
    public MediaAssetResponse updatePrintStatus(UUID assetId, UpdatePrintStatusRequest request) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        asset.setIsPrinted(request.isPrinted());
        EventMediaAsset updated = mediaRepo.save(asset);
        return enrichResponse(updated);
    }

    @Override
    @Transactional
    public MediaAssetResponse updateApproval(UUID assetId, MediaApprovalRequest request) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        asset.setApprovalStatus(request.approvalStatus());
        asset.setApprovedBy(request.approvedBy());
        EventMediaAsset updated = mediaRepo.save(asset);
        return enrichResponse(updated);
    }

    private MediaAssetResponse enrichResponse(EventMediaAsset asset) {
        MediaAssetResponse res = mediaMapper.toResponse(asset);
        if (storageService != null) {
            String previewUrl = res.previewImageUrl();
            if (previewUrl != null && !previewUrl.isBlank() && previewUrl.contains(".amazonaws.com/")) {
                try {
                    PresignedDownloadResponse presigned = storageService.generatePresignedDownloadUrl(previewUrl);
                    if (presigned != null && presigned.downloadUrl() != null) {
                        res = new MediaAssetResponse(
                                res.id(),
                                res.eventId(),
                                res.assetType(),
                                res.title(),
                                res.specifications(),
                                res.designFileUrl(),
                                presigned.downloadUrl(),
                                res.isPrinted(),
                                res.approvalStatus(),
                                res.approvedBy(),
                                res.createdAt()
                        );
                    }
                } catch (Exception ex) {
                    if (LOGGER.isWarnEnabled()) {
                        LOGGER.warn("Không thể tạo pre-signed URL cho previewImageUrl [assetId={}, url={}]: {}", res.id(), previewUrl, ex.getMessage());
                    }
                }
            }
        }
        return res;
    }

    @Override
    @Transactional
    public void deleteMediaAsset(UUID assetId) {
        EventMediaAsset asset = mediaRepo.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException(NOT_FOUND_MSG + assetId));

        if (Boolean.TRUE.equals(asset.getIsPrinted())) {
            throw new IllegalStateException("Không thể xóa ấn phẩm đã được in ấn");
        }

        String previewUrl = asset.getPreviewImageUrl();
        String designFileUrl = asset.getDesignFileUrl();
        mediaRepo.delete(asset);

        if (storageService != null) {
            if (previewUrl != null && !previewUrl.isBlank()) {
                try {
                    storageService.deleteFile(previewUrl);
                } catch (Exception ex) {
                    if (LOGGER.isWarnEnabled()) {
                        LOGGER.warn("Không thể xóa ảnh preview S3 [assetId={}, url={}]: {}", assetId, previewUrl, ex.getMessage());
                    }
                }
            }
            if (designFileUrl != null && !designFileUrl.isBlank() && designFileUrl.contains(".amazonaws.com/")) {
                try {
                    storageService.deleteFile(designFileUrl);
                } catch (Exception ex) {
                    if (LOGGER.isWarnEnabled()) {
                        LOGGER.warn("Không thể xóa file thiết kế S3 [assetId={}, url={}]: {}", assetId, designFileUrl, ex.getMessage());
                    }
                }
            }
        }
    }
}
