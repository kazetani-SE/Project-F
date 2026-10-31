package com.projectf.features.storage.service.impl;

import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.enums.StorageCategory;
import com.projectf.features.storage.service.StorageService;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3StorageServiceImpl implements StorageService {

    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final String region;
    private final int expirationMinutes;

    public S3StorageServiceImpl(
            S3Presigner s3Presigner,
            @Value("${aws.s3.bucket-name:project-f-media-storage}") String bucketName,
            @Value("${aws.region:ap-southeast-1}") String region,
            @Value("${aws.s3.presigned-url-expiration-minutes:10}") int expirationMinutes
    ) {
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
        this.region = region;
        this.expirationMinutes = expirationMinutes;
    }

    @Override
    public PresignedUploadResponse generatePresignedUploadUrl(PresignedUploadRequest request) {
        StorageCategory category = request.category();
        if (request.fileSize() > category.getMaxSizeBytes()) {
            long maxMb = category.getMaxSizeBytes() / (1024 * 1024);
            throw new IllegalArgumentException("Kích thước tệp vượt quá hạn mức cho phép (" + maxMb + "MB)");
        }
        if (!category.isAllowedMimeType(request.mimeType())) {
            throw new IllegalArgumentException("Định dạng tệp không được hỗ trợ cho danh mục " + category);
        }

        String sanitized = request.fileName().replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectKey = category.getFolderName() + "/" + UUID.randomUUID() + "-" + sanitized;

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(request.mimeType())
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        String fileUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + objectKey;

        return new PresignedUploadResponse(
                presigned.url().toString(),
                fileUrl,
                objectKey,
                expirationMinutes
        );
    }

    @Override
    public PresignedDownloadResponse generatePresignedDownloadUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("Đường dẫn tệp (objectKey) không được để trống");
        }

        String cleanKey = objectKey;
        String prefix = "https://" + bucketName + ".s3." + region + ".amazonaws.com/";
        if (cleanKey.startsWith(prefix)) {
            cleanKey = cleanKey.substring(prefix.length());
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(cleanKey)
                .build();

        int expMinutes = 15;
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);

        return new PresignedDownloadResponse(
                presigned.url().toString(),
                cleanKey,
                expMinutes
        );
    }
}
