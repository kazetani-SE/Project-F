package com.projectf.features.finance.controller;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.response.ApiResponse;
import com.projectf.features.finance.dto.request.AutoProjectBudgetRequest;
import com.projectf.features.finance.dto.request.CategoryReplacementOptionsRequest;
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
import com.projectf.features.finance.dto.response.CategoryReplacementOptionsResponse;
import com.projectf.features.finance.dto.response.EventBudgetSummaryResponse;
import com.projectf.features.finance.dto.response.ExpenseReceiptResponse;
import com.projectf.features.finance.dto.response.ExpenseResponse;
import com.projectf.features.finance.dto.response.ProjectedBudgetResponse;
import com.projectf.features.finance.service.BenchmarkService;
import com.projectf.features.finance.service.BudgetItemService;
import com.projectf.features.finance.service.ExpenseService;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "Finance", description = "Quản lý danh mục, định mức, dự toán, phát sinh và báo cáo ngân sách")
@RestController
@RequestMapping("/events/{eventId}/v1/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final BudgetItemService budgetItemService;
    private final BenchmarkService benchmarkService;
    private final ExpenseService expenseService;

    // ========================================================================
    // 1. DANH MỤC KINH PHÍ (BUDGET CATEGORIES)
    // ========================================================================

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<BudgetCategoryResponse>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.getAllCategories()));
    }

    @GetMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<BudgetCategoryResponse>> getCategoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.getCategoryById(id)));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<BudgetCategoryResponse>> createCategory(
            @Valid @RequestBody CreateBudgetCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(budgetItemService.createCategory(request)));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<BudgetCategoryResponse>> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBudgetCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.updateCategory(id, request)));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable UUID id) {
        budgetItemService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 2. BẢNG THAM CHIẾU GIÁ THỊ TRƯỜNG (BENCHMARKS)
    // ========================================================================

    @GetMapping("/benchmarks")
    public ResponseEntity<ApiResponse<List<BenchmarkResponse>>> getAllBenchmarks(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(benchmarkService.getAllBenchmarks(categoryId, keyword)));
    }

    @GetMapping("/benchmarks/{id}")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> getBenchmarkById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(benchmarkService.getBenchmarkById(id)));
    }

    @PostMapping("/benchmarks")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> createBenchmark(
            @Valid @RequestBody CreateBenchmarkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(benchmarkService.createBenchmark(request)));
    }

    @PutMapping("/benchmarks/{id}")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> updateBenchmark(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBenchmarkRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(benchmarkService.updateBenchmark(id, request)));
    }

    @DeleteMapping("/benchmarks/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBenchmark(@PathVariable UUID id) {
        benchmarkService.deleteBenchmark(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 3. DỰ TRÙ KINH PHÍ CHI TIẾT (BUDGET ITEMS)
    // ========================================================================

    @GetMapping("/budgets")
    public ResponseEntity<ApiResponse<List<BudgetItemResponse>>> getBudgetItems(
            @PathVariable UUID eventId,
            @RequestParam(required = false) ApprovalStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.getBudgetItemsByEvent(eventId, status)));
    }

    @PostMapping("/budgets")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> createBudgetItem(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateBudgetItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(budgetItemService.createBudgetItem(eventId, request)));
    }

    @GetMapping("/budgets/{id}")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> getBudgetItemById(
            @PathVariable UUID eventId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.getBudgetItemById(eventId, id)));
    }

    @PutMapping("/budgets/{id}")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> updateBudgetItem(
            @PathVariable UUID eventId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBudgetItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.updateBudgetItem(eventId, id, request)));
    }

    @PostMapping("/budgets/{id}/review")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> reviewBudgetItem(
            @PathVariable UUID eventId,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewBudgetItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.reviewBudgetItem(eventId, id, request)));
    }

    @DeleteMapping("/budgets/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBudgetItem(
            @PathVariable UUID eventId,
            @PathVariable UUID id) {
        budgetItemService.deleteBudgetItem(eventId, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 4. DỰ TOÁN TỰ ĐỘNG TỪ MÙA TRƯỚC (AUTO-PROJECTION)
    // ========================================================================

    @GetMapping("/budgets/projected-preview")
    public ResponseEntity<ApiResponse<List<ProjectedBudgetResponse>>> getProjectedBudgetPreview(
            @PathVariable UUID eventId,
            @RequestParam UUID previousEventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                budgetItemService.getProjectedBudgetPreview(eventId, previousEventId)));
    }

    @PostMapping("/budgets/project-from-previous")
    public ResponseEntity<ApiResponse<List<BudgetItemResponse>>> autoProjectFromPreviousSeason(
            @PathVariable UUID eventId,
            @Valid @RequestBody AutoProjectBudgetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(budgetItemService.autoProjectFromPreviousSeason(eventId, request)));
    }

    /**
     * GHI CHÚ CHO FE: khi POST /budgets/project-from-previous trả 400 mà `message`
     * chỉ gồm các UUID cách nhau bằng dấu phẩy (regex:
     * ^[0-9a-fA-F-]{36}(,[0-9a-fA-F-]{36})*$) thì đó là danh sách danh mục đã bị xóa.
     * Luồng:
     *  (1) tách message theo ',' rồi gọi endpoint này với deletedCateIds;
     *  (2) hiện UI cho người dùng chọn danh mục mới (activeCategories) thay cho từng
     *      danh mục cũ (deletedCategories);
     *  (3) gọi lại project-from-previous với thêm
     *      cateReplacements: [{oldCategoryId, newCategoryId}, ...].
     */
    @PostMapping("/budgets/replacement-options")
    public ResponseEntity<ApiResponse<CategoryReplacementOptionsResponse>> getCategoryReplacementOptions(
            @Valid @RequestBody CategoryReplacementOptionsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                budgetItemService.getCategoryReplacementOptions(request.deletedCateIds())));
    }

    // ========================================================================
    // 5. CHI TIÊU THỰC TẾ & DUYỆT CHI (EXPENSES & RECEIPTS)
    // ========================================================================

    @GetMapping("/expenses")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> getExpenses(
            @PathVariable UUID eventId,
            @RequestParam(required = false) ApprovalStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.getExpensesByEvent(eventId, status)));
    }

    @GetMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getExpenseById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.getExpenseById(id)));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateExpenseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(expenseService.createExpense(eventId, request)));
    }

    @PutMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> updateExpense(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.updateExpense(id, request)));
    }

    @PostMapping("/expenses/{id}/review")
    public ResponseEntity<ApiResponse<ExpenseResponse>> reviewExpense(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.reviewExpense(id, request)));
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExpense(@PathVariable UUID id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/expenses/{id}/receipts")
    public ResponseEntity<ApiResponse<ExpenseReceiptResponse>> addReceipt(
            @PathVariable UUID id,
            @Valid @RequestBody CreateReceiptRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(expenseService.addReceipt(id, request)));
    }

    @DeleteMapping("/expenses/{expenseId}/receipts/{receiptId}")
    public ResponseEntity<ApiResponse<Void>> deleteReceipt(
            @PathVariable UUID expenseId,
            @PathVariable UUID receiptId) {
        expenseService.deleteReceipt(expenseId, receiptId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // 6. REAL-TIME BUDGET DASHBOARD SUMMARY
    // ========================================================================

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<EventBudgetSummaryResponse>> getBudgetSummary(
            @PathVariable UUID eventId) {
        return ResponseEntity.ok(ApiResponse.ok(budgetItemService.getBudgetSummary(eventId)));
    }
}