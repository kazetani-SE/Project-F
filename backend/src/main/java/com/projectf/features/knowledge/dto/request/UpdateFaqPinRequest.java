package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateFaqPinRequest(
        @NotNull(message = "Trạng thái ghim không được để trống")
        Boolean isPinned
) {
}
