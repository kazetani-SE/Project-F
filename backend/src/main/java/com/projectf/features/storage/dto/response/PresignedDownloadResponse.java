package com.projectf.features.storage.dto.response;

public record PresignedDownloadResponse(String downloadUrl, int expiresInMinutes) { }
