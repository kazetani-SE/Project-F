package com.projectf.features.storage.enums;

import java.util.Locale;
import java.util.Set;

public enum StorageCategory {
    RECEIPT(15L * 1024 * 1024, "receipts", Set.of(
            "image/jpeg", "image/png", "image/webp", "application/pdf"
    )),
    DOCUMENT(50L * 1024 * 1024, "documents", Set.of()),
    MEDIA(50L * 1024 * 1024, "media", Set.of()),
    FEEDBACK(50L * 1024 * 1024, "feedbacks", Set.of());

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
}
