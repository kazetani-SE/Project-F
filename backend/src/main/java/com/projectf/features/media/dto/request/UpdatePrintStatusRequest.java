package com.projectf.features.media.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdatePrintStatusRequest(
        @NotNull(message = "Trạng thái in ấn không được để trống")
        Boolean isPrinted
) {
}
