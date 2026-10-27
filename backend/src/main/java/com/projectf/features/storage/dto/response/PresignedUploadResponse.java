package com.projectf.features.storage.dto.response;

public record PresignedUploadResponse(String uploadUrl, String fileUrl,
        String objectKey, int expiresInMinutes) { }
