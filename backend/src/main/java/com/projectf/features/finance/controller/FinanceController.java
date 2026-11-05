package com.projectf.features.finance.controller;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.response.ApiResponse;
import com.projectf.features.finance.dto.request.AutoProjectBudgetRequest;
import com.projectf.features.finance.dto.request.CreateBenchmarkRequest;
import com.projectf.features.finance.dto.request.CreateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.dto.request.CreateExpenseRequest;
import com.projectf.features.finance.dto.request.CreateReceiptRequest;
import com.projectf.features.finance.dto.request.ReviewBudgetItemRequest;
import com.projectf.features.finance.dto.request.ReviewExpenseRequest;
import com.projectf.features.finance.dto.request.UpdateBenchmarkRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetItemRequest;
import com.projectf.features.finance.dto.request.UpdateExpenseRequest;
import com.projectf.features.finance.dto.response.BenchmarkResponse;
import com.projectf.features.finance.dto.response.BudgetCategoryResponse;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.dto.response.EventBudgetSummaryResponse;
import com.projectf.features.finance.dto.response.ExpenseReceiptResponse;
import com.projectf.features.finance.dto.response.ExpenseResponse;
import com.projectf.features.finance.dto.response.ProjectedBudgetResponse;
import com.projectf.features.finance.service.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;

    // ========================================================================
    // 1. DANH MỤC KINH PHÍ (BUDGET CATEGORIES)
    // ========================================================================

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<BudgetCategoryResponse>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getAllCategories()));
    }

    @GetMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<BudgetCategoryResponse>> getCategoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getCategoryById(id)));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<BudgetCategoryResponse>> createCategory(
        @Valid @RequestBody CreateBudgetCategoryRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(financeService.createCategory(request)));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<BudgetCategoryResponse>> updateCategory(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateBudgetCategoryRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.updateCategory(id, request)));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable UUID id) {
        financeService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 2. BẢNG THAM CHIẾU GIÁ THỊ TRƯỜNG (BENCHMARKS)
    // ========================================================================

    @GetMapping("/benchmarks")
    public ResponseEntity<ApiResponse<List<BenchmarkResponse>>> getAllBenchmarks(
        @RequestParam(required = false) UUID categoryId,
        @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getAllBenchmarks(categoryId, keyword)));
    }

    @GetMapping("/benchmarks/{id}")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> getBenchmarkById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getBenchmarkById(id)));
    }

    @PostMapping("/benchmarks")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> createBenchmark(
        @Valid @RequestBody CreateBenchmarkRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(financeService.createBenchmark(request)));
    }

    @PutMapping("/benchmarks/{id}")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> updateBenchmark(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateBenchmarkRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.updateBenchmark(id, request)));
    }

    @DeleteMapping("/benchmarks/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBenchmark(@PathVariable UUID id) {
        financeService.deleteBenchmark(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 3. DỰ TRÙ KINH PHÍ CHI TIẾT (BUDGET ITEMS)
    // ========================================================================

    @GetMapping("/budgets")
    public ResponseEntity<ApiResponse<List<BudgetItemResponse>>> getBudgetItems(
        @RequestParam UUID eventId,
        @RequestParam(required = false) ApprovalStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getBudgetItemsByEvent(eventId, status)));
    }

    @GetMapping("/budgets/{id}")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> getBudgetItemById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getBudgetItemById(id)));
    }

    @PostMapping("/budgets")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> createBudgetItem(
        @Valid @RequestBody CreateBudgetItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(financeService.createBudgetItem(request)));
    }

    @PutMapping("/budgets/{id}")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> updateBudgetItem(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateBudgetItemRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.updateBudgetItem(id, request)));
    }

    @PostMapping("/budgets/{id}/review")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> reviewBudgetItem(
        @PathVariable UUID id,
        @Valid @RequestBody ReviewBudgetItemRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.reviewBudgetItem(id, request)));
    }

    @DeleteMapping("/budgets/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBudgetItem(@PathVariable UUID id) {
        financeService.deleteBudgetItem(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 4. DỰ TOÁN TỰ ĐỘNG TỪ MÙA TRƯỚC (AUTO-PROJECTION)
    // ========================================================================

    @GetMapping("/budgets/projected-preview")
    public ResponseEntity<ApiResponse<List<ProjectedBudgetResponse>>> getProjectedBudgetPreview(
        @RequestParam UUID previousEventId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getProjectedBudgetPreview(previousEventId)));
    }

    @PostMapping("/budgets/project-from-previous")
    public ResponseEntity<ApiResponse<List<BudgetItemResponse>>> autoProjectFromPreviousSeason(
        @Valid @RequestBody AutoProjectBudgetRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(financeService.autoProjectFromPreviousSeason(request)));
    }

    // ========================================================================
    // 5. CHI TIÊU THỰC TẾ & DUYỆT CHI (EXPENSES & RECEIPTS)
    // ========================================================================

    @GetMapping("/expenses")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> getExpenses(
        @RequestParam UUID eventId,
        @RequestParam(required = false) ApprovalStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getExpensesByEvent(eventId, status)));
    }

    @GetMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getExpenseById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getExpenseById(id)));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(
        @Valid @RequestBody CreateExpenseRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(financeService.createExpense(request)));
    }

    @PutMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> updateExpense(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateExpenseRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.updateExpense(id, request)));
    }

    @PostMapping("/expenses/{id}/review")
    public ResponseEntity<ApiResponse<ExpenseResponse>> reviewExpense(
        @PathVariable UUID id,
        @Valid @RequestBody ReviewExpenseRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.reviewExpense(id, request)));
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExpense(@PathVariable UUID id) {
        financeService.deleteExpense(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/expenses/{id}/receipts")
    public ResponseEntity<ApiResponse<ExpenseReceiptResponse>> addReceipt(
        @PathVariable UUID id,
        @Valid @RequestBody CreateReceiptRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(financeService.addReceipt(id, request)));
    }

    @DeleteMapping("/expenses/{expenseId}/receipts/{receiptId}")
    public ResponseEntity<ApiResponse<Void>> deleteReceipt(
        @PathVariable UUID expenseId,
        @PathVariable UUID receiptId
    ) {
        financeService.deleteReceipt(expenseId, receiptId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 6. REAL-TIME BUDGET DASHBOARD SUMMARY
    // ========================================================================

    @GetMapping("/summary/{eventId}")
    public ResponseEntity<ApiResponse<EventBudgetSummaryResponse>> getBudgetSummary(
        @PathVariable UUID eventId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(financeService.getBudgetSummary(eventId)));
    }
}