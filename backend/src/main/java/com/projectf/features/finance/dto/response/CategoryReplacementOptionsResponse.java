package com.projectf.features.finance.dto.response;

import java.util.List;

public record CategoryReplacementOptionsResponse(
        List<BudgetCategoryResponse> deletedCategories,
        List<BudgetCategoryResponse> activeCategories) {
}