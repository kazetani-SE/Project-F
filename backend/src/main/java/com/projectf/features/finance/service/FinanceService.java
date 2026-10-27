package com.projectf.features.finance.service;

import com.projectf.common.response.PageResponse;
import com.projectf.features.finance.dto.request.*;
import com.projectf.features.finance.dto.response.*;
import java.util.List;
import java.util.UUID;

public interface FinanceService {
    PageResponse<CategoryResponse> categories(int page, int size);
    CategoryResponse category(CategoryRequest request);
    PageResponse<BenchmarkResponse> benchmarks(UUID categoryId, String keyword, int page, int size);
    BenchmarkResponse benchmark(BenchmarkRequest request);
    BenchmarkResponse updateBenchmark(UUID id, BenchmarkUpdateRequest request);
    PageResponse<BudgetItemResponse> budgets(UUID eventId, int page, int size);
    BudgetItemResponse createBudget(UUID eventId, BudgetItemRequest request);
    BudgetItemResponse approveBudget(UUID eventId, UUID itemId, ApprovalRequest request);
    PageResponse<ExpenseResponse> expenses(UUID eventId, int page, int size);
    ExpenseResponse createExpense(UUID eventId, ExpenseRequest request);
    ReceiptResponse addReceipt(UUID eventId, UUID expenseId, ReceiptRequest request);
    ExpenseResponse approveExpense(UUID eventId, UUID expenseId, ApprovalRequest request);
    BudgetSummaryResponse summary(UUID eventId);
    List<ProjectedBudgetResponse> projected(UUID eventId);
    List<BudgetItemResponse> applyProjected(UUID eventId);
}
