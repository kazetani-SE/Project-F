package com.projectf.features.storage.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.storage.service.StorageService;
import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/storage")
public class StorageController {
    private final StorageService service;

    public StorageController(final StorageService service) {
        this.service = service;
    }

    @PostMapping("/presigned-upload")
    public ApiResponse<PresignedUploadResponse> upload(@Valid @RequestBody final PresignedUploadRequest body) {
        return ApiResponse.ok(service.upload(body));
    }

    @GetMapping("/presigned-download")
    public ApiResponse<PresignedDownloadResponse> download(@RequestParam final String objectKey) {
        return ApiResponse.ok(service.download(objectKey));
    }
}
