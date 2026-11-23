package com.projectf.features.storage.service.impl;

import com.projectf.features.storage.dto.request.PresignedUploadRequest;
import com.projectf.features.storage.dto.response.PresignedDownloadResponse;
import com.projectf.features.storage.dto.response.PresignedUploadResponse;
import com.projectf.features.storage.dto.response.S3ObjectVersionResponse;
import com.projectf.features.storage.enums.StorageCategory;
import com.projectf.features.storage.service.StorageService;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectVersionsRequest;
import software.amazon.awssdk.services.s3.model.ListObjectVersionsResponse;
import software.amazon.awssdk.services.s3.model.ObjectVersion;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3StorageServiceImpl implements StorageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(S3StorageServiceImpl.class);
    private static final String EMPTY_KEY_ERR = "Đường dẫn tệp (objectKey) không được để trống";
    private static final String VERSION_PARAM = "versionId";

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final String bucketName;
    private final String region;
    private final int expirationMinutes;
    private final Map<String, CachedDownloadUrl> downloadUrlCache = new ConcurrentHashMap<>();

    private record CachedDownloadUrl(PresignedDownloadResponse response, long expiresAtMillis) {}

    @Autowired
    public S3StorageServiceImpl(
            S3Presigner s3Presigner,
            @Autowired(required = false) S3Client s3Client,
            @Value("${aws.s3.bucket-name:project-f-media-storage}") String bucketName,
            @Value("${aws.region:ap-southeast-1}") String region,
            @Value("${aws.s3.presigned-url-expiration-minutes:10}") int expirationMinutes
    ) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.region = region;
        this.expirationMinutes = expirationMinutes;
    }

    public S3StorageServiceImpl(
            S3Presigner s3Presigner,
            String bucketName,
            String region,
            int expirationMinutes
    ) {
        this(s3Presigner, null, bucketName, region, expirationMinutes);
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

        String objectKey = resolveTargetObjectKey(category, request.fileName(), request.targetObjectKey());

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
        String fileUrl = buildBaseFileUrl(objectKey);

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
            throw new IllegalArgumentException(EMPTY_KEY_ERR);
        }

        String versionId = extractVersionId(objectKey);
        String cleanKey = extractObjectKey(objectKey);
        String cacheKey = cleanKey + (versionId != null && !versionId.isBlank() ? "#" + versionId : "");

        long now = System.currentTimeMillis();
        CachedDownloadUrl cached = downloadUrlCache.get(cacheKey);
        PresignedDownloadResponse response;
        if (cached != null && cached.expiresAtMillis() > now) {
            response = cached.response();
        } else {
            GetObjectRequest.Builder requestBuilder = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(cleanKey)
                    .responseCacheControl("public, max-age=600, immutable");

            if (versionId != null && !versionId.isBlank()) {
                requestBuilder.versionId(versionId);
            }

            GetObjectRequest getObjectRequest = requestBuilder.build();

            int expMinutes = 15;
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(expMinutes))
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);

            response = new PresignedDownloadResponse(
                    presigned.url().toString(),
                    cleanKey,
                    expMinutes
            );

            // Cache 10 phút trên Server để chuỗi URL không bị thay đổi chữ ký liên tục, giúp Trình duyệt nhận diện Disk Cache
            downloadUrlCache.put(cacheKey, new CachedDownloadUrl(response, now + 10L * 60 * 1000));
        }

        return response;
    }

    @Override
    public List<S3ObjectVersionResponse> listObjectVersions(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException(EMPTY_KEY_ERR);
        }

        String cleanKey = extractObjectKey(objectKey);
        List<S3ObjectVersionResponse> versions = new ArrayList<>();

        if (s3Client != null) {
            try {
                ListObjectVersionsRequest listReq = ListObjectVersionsRequest.builder()
                        .bucket(bucketName)
                        .prefix(cleanKey)
                        .build();
                ListObjectVersionsResponse listRes = s3Client.listObjectVersions(listReq);
                if (listRes.hasVersions()) {
                    for (ObjectVersion ver : listRes.versions()) {
                        if (cleanKey.equals(ver.key())) {
                            String verId = ver.versionId();
                            boolean hasRealVersion = verId != null && !verId.isBlank() && !"null".equalsIgnoreCase(verId);
                            String versionedUrl = hasRealVersion
                                    ? buildBaseFileUrl(cleanKey) + "?" + VERSION_PARAM + "=" + verId
                                    : buildBaseFileUrl(cleanKey);
                            versions.add(new S3ObjectVersionResponse(
                                    cleanKey,
                                    verId,
                                    Boolean.TRUE.equals(ver.isLatest()),
                                    ver.size() != null ? ver.size() : 0L,
                                    ver.lastModified(),
                                    ver.eTag(),
                                    versionedUrl
                            ));
                        }
                    }
                }
                versions.sort(Comparator.comparing(
                        S3ObjectVersionResponse::lastModified,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ));
            } catch (Exception ex) {
                if (LOGGER.isWarnEnabled()) {
                    LOGGER.warn("Không thể truy vấn danh sách phiên bản S3 [bucket={}, key={}]: {}",
                            bucketName, cleanKey, ex.getMessage());
                }
            }
        }
        return versions;
    }

    @Override
    public void deleteFile(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException(EMPTY_KEY_ERR);
        }
        String embeddedVersionId = extractVersionId(objectKey);
        deleteFileVersion(objectKey, embeddedVersionId);
    }

    @Override
    public void deleteFileVersion(String objectKey, String versionId) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException(EMPTY_KEY_ERR);
        }

        String cleanKey = extractObjectKey(objectKey);
        String resolvedVersionId = (versionId != null && !versionId.isBlank())
                ? versionId.trim()
                : extractVersionId(objectKey);

        if (resolvedVersionId != null && !resolvedVersionId.isBlank()) {
            downloadUrlCache.remove(cleanKey + "#" + resolvedVersionId);
        } else {
            downloadUrlCache.keySet().removeIf(k -> k.equals(cleanKey) || k.startsWith(cleanKey + "#"));
        }

        if (s3Client != null) {
            try {
                DeleteObjectRequest.Builder deleteBuilder = DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(cleanKey);
                if (resolvedVersionId != null && !resolvedVersionId.isBlank()) {
                    deleteBuilder.versionId(resolvedVersionId);
                }
                s3Client.deleteObject(deleteBuilder.build());
            } catch (Exception ex) {
                if (LOGGER.isWarnEnabled()) {
                    LOGGER.warn("Không thể xóa object trên S3 [bucket={}, key={}, versionId={}]: {}",
                            bucketName, cleanKey, resolvedVersionId, ex.getMessage());
                }
            }
        }
    }

    private String resolveTargetObjectKey(StorageCategory category, String rawFileName, String targetObjectKey) {
        String resolvedKey;
        if (targetObjectKey != null && !targetObjectKey.isBlank()) {
            String cleanTarget = extractObjectKey(targetObjectKey);
            String expectedPrefix = category.getFolderName() + "/";
            if (cleanTarget.startsWith(expectedPrefix) && cleanTarget.length() > expectedPrefix.length()) {
                resolvedKey = cleanTarget;
            } else {
                String targetFileName = sanitizeFileName(cleanTarget);
                resolvedKey = expectedPrefix + targetFileName;
            }
        } else {
            String sanitized = sanitizeFileName(rawFileName);
            resolvedKey = category.getFolderName() + "/" + sanitized;
        }
        return resolvedKey;
    }

    private String buildBaseFileUrl(String objectKey) {
        return "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + objectKey;
    }

    public static String sanitizeFileName(String rawFileName) {
        String result = "unnamed-file";
        if (rawFileName != null && !rawFileName.isBlank()) {
            String normalized = Normalizer.normalize(rawFileName, Normalizer.Form.NFC);
            String cleaned = normalized.replaceAll("[\\p{Cntrl}/\\\\]+", "_").trim();
            if (!cleaned.isBlank()) {
                result = cleaned;
            }
        }
        return result;
    }

    private String extractVersionId(String objectKeyOrUrl) {
        String result = null;
        if (objectKeyOrUrl != null) {
            int queryIdx = objectKeyOrUrl.indexOf('?');
            if (queryIdx >= 0) {
                String queryString = objectKeyOrUrl.substring(queryIdx + 1);
                String[] pairs = queryString.split("&");
                for (String pair : pairs) {
                    int eqIdx = pair.indexOf('=');
                    if (eqIdx > 0) {
                        String key = pair.substring(0, eqIdx);
                        if (VERSION_PARAM.equalsIgnoreCase(key) && eqIdx < pair.length() - 1) {
                            result = URLDecoder.decode(pair.substring(eqIdx + 1), StandardCharsets.UTF_8);
                            break;
                        }
                    }
                }
            }
        }
        return result;
    }

    private String extractObjectKey(String objectKeyOrUrl) {
        String candidate = objectKeyOrUrl.trim();
        int queryIdx = candidate.indexOf('?');
        if (queryIdx >= 0) {
            candidate = candidate.substring(0, queryIdx);
        }

        String prefix = "https://" + bucketName + ".s3." + region + ".amazonaws.com/";
        if (candidate.startsWith(prefix)) {
            candidate = candidate.substring(prefix.length());
        } else if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
            try {
                URI parsed = URI.create(candidate);
                if (parsed.getRawPath() != null) {
                    candidate = parsed.getRawPath();
                }
            } catch (IllegalArgumentException ignored) {
                int slashIdx = candidate.indexOf('/', candidate.indexOf("://") + 3);
                if (slashIdx >= 0) {
                    candidate = candidate.substring(slashIdx + 1);
                }
            }
        }
        while (candidate.startsWith("/")) {
            candidate = candidate.substring(1);
        }
        if (candidate.contains("%")) {
            candidate = URLDecoder.decode(candidate.replace("+", "%2B"), StandardCharsets.UTF_8);
        }
        return candidate;
    }
}
