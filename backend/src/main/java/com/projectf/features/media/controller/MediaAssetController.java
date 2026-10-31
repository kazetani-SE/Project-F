package com.projectf.features.media.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.media.dto.request.CreateMediaAssetRequest;
import com.projectf.features.media.dto.request.MediaApprovalRequest;
import com.projectf.features.media.dto.request.UpdatePrintStatusRequest;
import com.projectf.features.media.dto.response.MediaAssetResponse;
import com.projectf.features.media.service.MediaAssetService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class MediaAssetController {

    private static final String EVENT_ID = "eventId";
    private static final String ASSET_ID = "assetId";

    private final MediaAssetService mediaAssetService;

    public MediaAssetController(MediaAssetService mediaAssetService) {
        this.mediaAssetService = mediaAssetService;
    }

    @GetMapping("/events/{eventId}/media-assets")
    public ResponseEntity<ApiResponse<List<MediaAssetResponse>>> getMediaAssets(
            @PathVariable(EVENT_ID) UUID eventId,
            @RequestParam(value = "assetType", required = false) String assetType
    ) {
        List<MediaAssetResponse> response = mediaAssetService.getMediaAssetsByEvent(eventId, assetType);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/events/{eventId}/media-assets")
    public ResponseEntity<ApiResponse<MediaAssetResponse>> createMediaAsset(
            @PathVariable(EVENT_ID) UUID eventId,
            @Valid @RequestBody CreateMediaAssetRequest request
    ) {
        MediaAssetResponse response = mediaAssetService.createMediaAsset(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/media-assets/{assetId}")
    public ResponseEntity<ApiResponse<MediaAssetResponse>> getMediaAssetById(
            @PathVariable(ASSET_ID) UUID assetId
    ) {
        MediaAssetResponse response = mediaAssetService.getMediaAssetById(assetId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping({"/events/{eventId}/media-assets/{assetId}/print-status", "/media-assets/{assetId}/print-status"})
    public ResponseEntity<ApiResponse<MediaAssetResponse>> updatePrintStatus(
            @PathVariable(value = EVENT_ID, required = false) UUID eventId,
            @PathVariable(ASSET_ID) UUID assetId,
            @Valid @RequestBody UpdatePrintStatusRequest request
    ) {
        MediaAssetResponse response = mediaAssetService.updatePrintStatus(assetId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping({"/events/{eventId}/media-assets/{assetId}/approval", "/media-assets/{assetId}/approval"})
    public ResponseEntity<ApiResponse<MediaAssetResponse>> updateApproval(
            @PathVariable(value = EVENT_ID, required = false) UUID eventId,
            @PathVariable(ASSET_ID) UUID assetId,
            @Valid @RequestBody MediaApprovalRequest request
    ) {
        MediaAssetResponse response = mediaAssetService.updateApproval(assetId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
