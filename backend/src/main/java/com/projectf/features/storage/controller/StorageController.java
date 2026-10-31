package com.projectf.features.storage.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.service.StorageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/storage")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/presigned-upload")
    public ResponseEntity<ApiResponse<PresignedUploadResponse>> createPresignedUpload(
            @Valid @RequestBody PresignedUploadRequest request
    ) {
        PresignedUploadResponse response = storageService.generatePresignedUploadUrl(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/presigned-download")
    public ResponseEntity<ApiResponse<PresignedDownloadResponse>> createPresignedDownload(
            @RequestParam("objectKey") String objectKey
    ) {
        PresignedDownloadResponse response = storageService.generatePresignedDownloadUrl(objectKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
