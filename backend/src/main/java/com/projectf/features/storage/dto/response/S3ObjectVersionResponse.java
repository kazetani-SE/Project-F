package com.projectf.features.storage.dto.response;

import java.time.Instant;

public record S3ObjectVersionResponse(
        String objectKey,
        String versionId,
        boolean isLatest,
        long sizeBytes,
        Instant lastModified,
        String eTag,
        String fileUrl
) {
}

