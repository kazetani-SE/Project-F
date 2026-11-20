package com.projectf.features.storage.enums;

import java.util.Locale;
import java.util.Set;

public enum StorageCategory {
    RECEIPT(15L * 1024 * 1024, "receipts", Set.of(
            Constants.MIME_JPEG,
            Constants.MIME_PNG,
            Constants.MIME_WEBP,
            Constants.MIME_PDF,
            Constants.MIME_DOCX,
            Constants.MIME_XLSX)),
    DOCUMENT(50L * 1024 * 1024, "documents", Set.of(
            Constants.MIME_PDF,
            Constants.MIME_DOCX,
            "application/msword",
            Constants.MIME_XLSX,
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint",
            Constants.MIME_PLAIN)),
    MEDIA(100L * 1024 * 1024, "media", Set.of(
            Constants.MIME_JPEG,
            Constants.MIME_PNG,
            Constants.MIME_WEBP,
            "image/svg+xml",
            "image/gif",
            "image/tiff",
            "image/x-tiff",
            "video/mp4",
            Constants.MIME_PDF)),
    FEEDBACK(50L * 1024 * 1024, "feedbacks", Set.of(
            Constants.MIME_JPEG,
            Constants.MIME_PNG,
            Constants.MIME_WEBP,
            Constants.MIME_PDF,
            Constants.MIME_PLAIN,
            Constants.MIME_XLSX,
            "application/vnd.ms-excel",
            "text/csv",
            "application/csv"));

    private final long maxSizeBytes;
    private final String folderName;
    private final Set<String> allowedMimeTypes;

    StorageCategory(long maxSizeBytes, String folderName, Set<String> allowedMimeTypes) {
        this.maxSizeBytes = maxSizeBytes;
        this.folderName = folderName;
        this.allowedMimeTypes = allowedMimeTypes;
    }

    public long getMaxSizeBytes() {
        return maxSizeBytes;
    }

    public String getFolderName() {
        return folderName;
    }

    public boolean isAllowedMimeType(String mimeType) {
        boolean isAllowed = false;
        if (mimeType != null && !mimeType.isBlank()) {
            isAllowed = allowedMimeTypes.isEmpty() || allowedMimeTypes.contains(mimeType.toLowerCase(Locale.ROOT));
        }
        return isAllowed;
    }

    private static final class Constants {
        private static final String MIME_JPEG = "image/jpeg";
        private static final String MIME_PNG = "image/png";
        private static final String MIME_WEBP = "image/webp";
        private static final String MIME_PDF = "application/pdf";
        private static final String MIME_PLAIN = "text/plain";
        private static final String MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        private static final String MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
}
