package com.projectf.features.storage.service;

import com.projectf.common.DomainRules;
import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class StorageService {
    private static final Set<String> PREFIXES = Set.of("receipts", "documents", "media", "feedbacks");
    private final String bucket;
    private final String region;
    private final int minutes;

    public StorageService(@Value("${aws.s3.bucket-name:}") final String bucket,
            @Value("${aws.region:ap-southeast-1}") final String region,
            @Value("${aws.s3.presigned-url-expiration-minutes:10}") final int minutes) {
        this.bucket = bucket;
        this.region = region;
        this.minutes = minutes;
    }

    public PresignedUploadResponse upload(final PresignedUploadRequest body) {
        configured();
        final String category = body.category();
        final String fileName = body.fileName();
        final String mimeType = body.mimeType();
        final long fileSize = body.fileSize();
        DomainRules.upload(category, mimeType, fileSize);
        final String extension = fileName.contains(".")
                ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase(Locale.ROOT) : "";
        if (!extension.matches("\\.[a-z0-9]{1,8}") && !extension.isEmpty()) {
            throw new IllegalArgumentException("UNSUPPORTED_FILE_TYPE");
        }
        final String prefix = switch (category) {
            case "RECEIPT" -> "receipts";
            case "DOCUMENT" -> "documents";
            case "MEDIA" -> "media";
            case "FEEDBACK" -> "feedbacks";
            default -> throw new IllegalArgumentException("VALIDATION_FAILED");
        };
        final String key = prefix + "/" + UUID.randomUUID() + extension;
        final PutObjectRequest put = PutObjectRequest.builder()
                .bucket(bucket).key(key).contentType(mimeType).contentLength(fileSize).build();
        try (S3Presigner presigner = presigner()) {
            final var signed = presigner.presignPutObject(PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(minutes)).putObjectRequest(put).build());
            return new PresignedUploadResponse(signed.url().toString(),
                    "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key, key, minutes);
        }
    }

    public PresignedDownloadResponse download(final String objectKey) {
        configured();
        if (objectKey == null || objectKey.contains("..") || objectKey.startsWith("/")
                || !PREFIXES.contains(objectKey.split("/", 2)[0])) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        try (S3Presigner presigner = presigner()) {
            final var signed = presigner.presignGetObject(GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(minutes))
                    .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(objectKey).build())
                    .build());
            return new PresignedDownloadResponse(signed.url().toString(), minutes);
        }
    }

    private S3Presigner presigner() {
        return S3Presigner.builder().region(Region.of(region)).build();
    }

    private void configured() {
        if (bucket.isBlank()) throw new IllegalStateException("S3_NOT_CONFIGURED");
    }
}
