package com.projectf.features.storage.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.service.StorageService;
import com.projectf.features.storage.service.AttachmentAccess;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Storage", description = "AWS S3 Pre-signed URL upload và download")
@RestController
@RequestMapping("/v1/storage")
public class StorageController {

    private final StorageService storageService;
    private final AttachmentAccess attachmentAccess;

    public StorageController(StorageService storageService, AttachmentAccess attachmentAccess) {
        this.storageService = storageService;
        this.attachmentAccess = attachmentAccess;
    }

    @Operation(summary = "Sinh Pre-signed URL tải lên S3", description = "Giới hạn 15MB cho hóa đơn và 50MB cho tài liệu/ấn phẩm.")
    @PostMapping("/presigned-upload")
    public ResponseEntity<ApiResponse<PresignedUploadResponse>> createPresignedUpload(
            @Valid @RequestBody PresignedUploadRequest request
    ) {
        PresignedUploadResponse response = storageService.generatePresignedUploadUrl(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Sinh Pre-signed URL tải xuống từ S3")
    @GetMapping("/presigned-download")
    public ResponseEntity<ApiResponse<PresignedDownloadResponse>> createPresignedDownload(
            @RequestParam("objectKey") String objectKey
    ) {
        attachmentAccess.requireDownload(objectKey);
        PresignedDownloadResponse response = storageService.generatePresignedDownloadUrl(objectKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Xóa tệp trên Amazon S3")
    @DeleteMapping("/file")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @RequestParam("objectKey") String objectKey
    ) {
        storageService.deleteFile(objectKey);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
