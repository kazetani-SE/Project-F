package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DraftIncidentAiRequest(
        @NotBlank(message = "Mô tả hiện tượng sự cố không được để trống")
        @Size(max = 2000, message = "Mô tả sự cố tối đa 2000 ký tự")
        String briefObservation,
        String eventTitle
) {
}
