package com.projectf.features.document.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateDocumentRequest(
        UUID parentDocumentId,

        @NotBlank(message = "Loại tài liệu không được để trống")
        @Size(max = 50, message = "Loại tài liệu tối đa 50 ký tự")
        String docType,

        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
        String title,

        @Size(max = 20, message = "Phiên bản tối đa 20 ký tự")
        String version,

        @NotBlank(message = "Đường dẫn tệp không được để trống")
        String fileUrl,

        @NotNull(message = "Người tải lên không được để trống")
        UUID uploadedBy
) {
}
