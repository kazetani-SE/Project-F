package com.projectf.features.storage.dto.response;

public record PresignedDownloadResponse(
        String downloadUrl,
        String objectKey,
        int expiresInMinutes
) {
}
