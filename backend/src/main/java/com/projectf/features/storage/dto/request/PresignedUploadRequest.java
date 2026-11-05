package com.projectf.features.storage.dto.request;

import com.projectf.features.storage.enums.StorageCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PresignedUploadRequest(
        @NotBlank(message = "Tên tệp không được để trống")
        String fileName,

        @NotBlank(message = "Định dạng MIME không được để trống")
        String mimeType,

        @NotNull(message = "Kích thước tệp không được để trống")
        @Positive(message = "Kích thước tệp phải lớn hơn 0")
        Long fileSize,

        @NotNull(message = "Danh mục lưu trữ không được để trống")
        StorageCategory category
) {
}
