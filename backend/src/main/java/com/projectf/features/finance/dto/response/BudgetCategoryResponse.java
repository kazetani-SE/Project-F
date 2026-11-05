package com.projectf.features.finance.dto.response;

import java.util.UUID;

public record BudgetCategoryResponse(
    UUID id,
    String name,
    String description
) {}

