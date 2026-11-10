package com.projectf.features.finance.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record AutoProjectBudgetRequest(
        @NotNull(message = "ID mùa sự kiện tham chiếu mùa trước là bắt buộc") UUID previousEventId,
        /** Tùy chọn. FE gửi khi người dùng đã chọn danh mục thay thế cho danh mục bị xóa. */
        @Valid List<CategoryReplacementRequest> cateReplacements) {
}