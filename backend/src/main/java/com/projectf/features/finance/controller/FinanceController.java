package com.projectf.features.finance.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.common.response.PageResponse;
import com.projectf.features.finance.dto.request.*;
import com.projectf.features.finance.dto.response.*;
import com.projectf.features.finance.service.FinanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
public class FinanceController {
    private final FinanceService service;
    public FinanceController(final FinanceService service) { this.service = service; }

    @GetMapping("/finance/categories")
    public ApiResponse<PageResponse<CategoryResponse>> categories(
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "50") final int size) {
        return ApiResponse.ok(service.categories(page, size));
    }
    @PostMapping("/finance/categories")
    public ResponseEntity<ApiResponse<CategoryResponse>> category(@Valid @RequestBody final CategoryRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.category(body)));
    }
    @GetMapping("/finance/benchmarks")
    public ApiResponse<PageResponse<BenchmarkResponse>> benchmarks(
            @RequestParam(required = false) final UUID categoryId,
            @RequestParam(required = false) final String keyword,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "50") final int size) {
        return ApiResponse.ok(service.benchmarks(categoryId, keyword, page, size));
    }
    @PostMapping("/finance/benchmarks")
    public ResponseEntity<ApiResponse<BenchmarkResponse>> benchmark(@Valid @RequestBody final BenchmarkRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.benchmark(body)));
    }
    @PutMapping("/finance/benchmarks/{id}")
    public ApiResponse<BenchmarkResponse> updateBenchmark(@PathVariable final UUID id,
            @Valid @RequestBody final BenchmarkUpdateRequest body) {
        return ApiResponse.ok(service.updateBenchmark(id, body));
    }
    @GetMapping("/events/{eventId}/budget-items")
    public ApiResponse<PageResponse<BudgetItemResponse>> budgets(@PathVariable final UUID eventId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.budgets(eventId, page, size));
    }
    @PostMapping("/events/{eventId}/budget-items")
    public ResponseEntity<ApiResponse<BudgetItemResponse>> createBudget(@PathVariable final UUID eventId,
            @Valid @RequestBody final BudgetItemRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createBudget(eventId, body)));
    }
    @PatchMapping("/events/{eventId}/budget-items/{itemId}/approval")
    public ApiResponse<BudgetItemResponse> approveBudget(@PathVariable final UUID eventId,
            @PathVariable final UUID itemId, @Valid @RequestBody final ApprovalRequest body) {
        return ApiResponse.ok(service.approveBudget(eventId, itemId, body));
    }
    @GetMapping("/events/{eventId}/expenses")
    public ApiResponse<PageResponse<ExpenseResponse>> expenses(@PathVariable final UUID eventId,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size) {
        return ApiResponse.ok(service.expenses(eventId, page, size));
    }
    @PostMapping("/events/{eventId}/expenses")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(@PathVariable final UUID eventId,
            @Valid @RequestBody final ExpenseRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createExpense(eventId, body)));
    }
    @PostMapping("/events/{eventId}/expenses/{expenseId}/receipts")
    public ResponseEntity<ApiResponse<ReceiptResponse>> addReceipt(@PathVariable final UUID eventId,
            @PathVariable final UUID expenseId, @Valid @RequestBody final ReceiptRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.addReceipt(eventId, expenseId, body)));
    }
    @PatchMapping("/events/{eventId}/expenses/{expenseId}/approval")
    public ApiResponse<ExpenseResponse> approveExpense(@PathVariable final UUID eventId,
            @PathVariable final UUID expenseId, @Valid @RequestBody final ApprovalRequest body) {
        return ApiResponse.ok(service.approveExpense(eventId, expenseId, body));
    }
    @GetMapping("/events/{eventId}/budget-summary")
    public ApiResponse<BudgetSummaryResponse> summary(@PathVariable final UUID eventId) {
        return ApiResponse.ok(service.summary(eventId));
    }
    @GetMapping("/events/{eventId}/projected-budget")
    public ApiResponse<List<ProjectedBudgetResponse>> projected(@PathVariable final UUID eventId) {
        return ApiResponse.ok(service.projected(eventId));
    }
    @PostMapping("/events/{eventId}/apply-projected-budget")
    public ApiResponse<List<BudgetItemResponse>> applyProjected(@PathVariable final UUID eventId) {
        return ApiResponse.ok(service.applyProjected(eventId));
    }
}
