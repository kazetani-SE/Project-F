package com.projectf.features.storage.service;

import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.dto.response.S3ObjectVersionResponse;
import java.util.List;

public interface StorageService {
    PresignedUploadResponse generatePresignedUploadUrl(PresignedUploadRequest request);

    PresignedDownloadResponse generatePresignedDownloadUrl(String objectKey);

    List<S3ObjectVersionResponse> listObjectVersions(String objectKey);

    void deleteFile(String objectKey);

    void deleteFileVersion(String objectKey, String versionId);
}
