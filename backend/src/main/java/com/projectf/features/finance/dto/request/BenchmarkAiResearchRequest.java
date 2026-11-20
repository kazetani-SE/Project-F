package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;

public record BenchmarkAiResearchRequest(
        @NotBlank(message = "Tên hạng mục không được để trống") String itemName,

        @NotBlank(message = "Đơn vị tính không được để trống") String unit,

        String locationContext) {
}