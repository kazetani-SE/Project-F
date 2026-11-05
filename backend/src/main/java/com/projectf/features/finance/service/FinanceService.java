package com.projectf.features.finance.service;

import com.projectf.common.enums.ApprovalStatus;
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

import java.util.List;
import java.util.UUID;

public interface FinanceService {

    // --- Danh mục kinh phí ---
    List<BudgetCategoryResponse> getAllCategories();
    BudgetCategoryResponse getCategoryById(UUID id);
    BudgetCategoryResponse createCategory(CreateBudgetCategoryRequest request);
    BudgetCategoryResponse updateCategory(UUID id, UpdateBudgetCategoryRequest request);
    void deleteCategory(UUID id);

    // --- Bảng giá chuẩn thị trường ---
    List<BenchmarkResponse> getAllBenchmarks(UUID categoryId, String keyword);
    BenchmarkResponse getBenchmarkById(UUID id);
    BenchmarkResponse createBenchmark(CreateBenchmarkRequest request);
    BenchmarkResponse updateBenchmark(UUID id, UpdateBenchmarkRequest request);
    void deleteBenchmark(UUID id);

    // --- Dự trù kinh phí ---
    List<BudgetItemResponse> getBudgetItemsByEvent(UUID eventId, ApprovalStatus status);
    BudgetItemResponse getBudgetItemById(UUID id);
    BudgetItemResponse createBudgetItem(CreateBudgetItemRequest request);
    BudgetItemResponse updateBudgetItem(UUID id, UpdateBudgetItemRequest request);
    BudgetItemResponse reviewBudgetItem(UUID id, ReviewBudgetItemRequest request);
    void deleteBudgetItem(UUID id);

    // --- Dự toán tự động từ mùa trước ---
    List<ProjectedBudgetResponse> getProjectedBudgetPreview(UUID previousEventId);
    List<BudgetItemResponse> autoProjectFromPreviousSeason(AutoProjectBudgetRequest request);

    // --- Thực chi & Duyệt chi ---
    List<ExpenseResponse> getExpensesByEvent(UUID eventId, ApprovalStatus status);
    ExpenseResponse getExpenseById(UUID id);
    ExpenseResponse createExpense(CreateExpenseRequest request);
    ExpenseResponse updateExpense(UUID id, UpdateExpenseRequest request);
    ExpenseResponse reviewExpense(UUID id, ReviewExpenseRequest request);
    void deleteExpense(UUID id);

    // --- Hóa đơn & Chứng từ ---
    ExpenseReceiptResponse addReceipt(UUID expenseId, CreateReceiptRequest request);
    void deleteReceipt(UUID expenseId, UUID receiptId);

    // --- Dashboard & Tóm tắt ngân sách ---
    EventBudgetSummaryResponse getBudgetSummary(UUID eventId);
}