package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record CategoryReplacementOptionsRequest(
        @NotEmpty(message = "Danh sách ID danh mục đã xóa không được rỗng") List<UUID> deletedCateIds) {
}