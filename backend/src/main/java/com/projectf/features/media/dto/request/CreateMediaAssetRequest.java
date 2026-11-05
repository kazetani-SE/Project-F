package com.projectf.features.media.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMediaAssetRequest(
        @NotBlank(message = "Loại ấn phẩm không được để trống")
        @Size(max = 50, message = "Loại ấn phẩm tối đa 50 ký tự")
        String assetType,

        @NotBlank(message = "Tiêu đề ấn phẩm không được để trống")
        @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
        String title,

        @Size(max = 255, message = "Quy cách kỹ thuật tối đa 255 ký tự")
        String specifications,

        String designFileUrl,

        String previewImageUrl
) {
}
