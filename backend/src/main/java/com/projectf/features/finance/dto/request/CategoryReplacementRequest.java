package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CategoryReplacementRequest(
        @NotNull(message = "ID danh mục cũ là bắt buộc") UUID oldCategoryId,
        @NotNull(message = "ID danh mục mới là bắt buộc") UUID newCategoryId) {
}