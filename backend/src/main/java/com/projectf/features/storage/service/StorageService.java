package com.projectf.features.storage.service;

import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;

public interface StorageService {
    PresignedUploadResponse generatePresignedUploadUrl(PresignedUploadRequest request);

    PresignedDownloadResponse generatePresignedDownloadUrl(String objectKey);

    void deleteFile(String objectKey);
}
