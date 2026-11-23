package com.projectf.features.storage.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.dto.response.S3ObjectVersionResponse;
import com.projectf.features.storage.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Storage", description = "AWS S3 Pre-signed URL upload, download và quản lý S3 Object Versioning")
@RestController
@RequestMapping("/v1/storage")
public class StorageController {

    private static final String OBJECT_KEY = "objectKey";

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
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
            @RequestParam(OBJECT_KEY) String objectKey
    ) {
        PresignedDownloadResponse response = storageService.generatePresignedDownloadUrl(objectKey);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Liệt kê lịch sử các phiên bản S3 (S3 Object Versioning) của một tệp")
    @GetMapping("/versions")
    public ResponseEntity<ApiResponse<List<S3ObjectVersionResponse>>> listObjectVersions(
            @RequestParam(OBJECT_KEY) String objectKey
    ) {
        List<S3ObjectVersionResponse> versions = storageService.listObjectVersions(objectKey);
        return ResponseEntity.ok(ApiResponse.ok(versions));
    }

    @Operation(summary = "Xóa tệp hoặc một phiên bản cụ thể trên Amazon S3")
    @DeleteMapping("/file")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @RequestParam(OBJECT_KEY) String objectKey,
            @RequestParam(value = "versionId", required = false) String versionId
    ) {
        if (versionId != null && !versionId.isBlank()) {
            storageService.deleteFileVersion(objectKey, versionId);
        } else {
            storageService.deleteFile(objectKey);
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
