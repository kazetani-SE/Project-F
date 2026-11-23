package com.projectf.features.document.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateDocumentFileVersionRequest(
        @NotBlank(message = "Đường dẫn fileUrl hoặc phiên bản S3 không được để trống")
        String fileUrl,

        String version
) {
}

