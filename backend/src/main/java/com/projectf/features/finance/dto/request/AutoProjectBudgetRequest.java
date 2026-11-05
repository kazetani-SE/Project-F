package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AutoProjectBudgetRequest(
    @NotNull(message = "ID mùa sự kiện mục tiêu là bắt buộc")
    UUID targetEventId,

    @NotNull(message = "ID mùa sự kiện tham chiếu mùa trước là bắt buộc")
    UUID previousEventId
) {}

