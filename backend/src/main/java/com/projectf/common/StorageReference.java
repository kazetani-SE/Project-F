package com.projectf.common;

import java.net.URI;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class StorageReference {
    private static final Map<String, String> PREFIX = Map.of(
            "RECEIPT", "receipts", "DOCUMENT", "documents",
            "MEDIA", "media", "FEEDBACK", "feedbacks");
    private final String bucket;
    private final String region;

    public StorageReference(@Value("${aws.s3.bucket-name:}") final String bucket,
            @Value("${aws.region:ap-southeast-1}") final String region) {
        this.bucket = bucket;
        this.region = region;
    }

    public void require(final String category, final String fileUrl) {
        final String prefix = PREFIX.get(category);
        if (prefix == null || bucket.isBlank() || fileUrl == null) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        try {
            final URI url = URI.create(fileUrl);
            final String host = bucket + ".s3." + region + ".amazonaws.com";
            final String path = url.getPath();
            if (!"https".equals(url.getScheme()) || !host.equals(url.getHost())
                    || url.getPort() != -1 || url.getRawQuery() != null
                    || url.getFragment() != null || path == null
                    || !path.matches("/" + prefix + "/[0-9a-fA-F-]{36}(\\.[a-z0-9]{1,8})?")) {
                throw new IllegalArgumentException("VALIDATION_FAILED");
            }
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("VALIDATION_FAILED", error);
        }
    }
}
