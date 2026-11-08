package com.projectf.features.finance.service;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.AutoProjectBudgetRequest;
import com.projectf.features.finance.dto.request.CreateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.dto.request.ReviewBudgetItemRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetItemRequest;
import com.projectf.features.finance.dto.response.BudgetCategoryResponse;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.dto.response.EventBudgetSummaryResponse;
import com.projectf.features.finance.dto.response.ProjectedBudgetResponse;

import java.util.List;
import java.util.UUID;

public interface BudgetItemService {

  // --- Danh mục kinh phí ---
  List<BudgetCategoryResponse> getAllCategories();
  BudgetCategoryResponse getCategoryById(UUID id);
  BudgetCategoryResponse createCategory(CreateBudgetCategoryRequest request);
  BudgetCategoryResponse updateCategory(UUID id, UpdateBudgetCategoryRequest request);
  void deleteCategory(UUID id);

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

  // --- Dashboard & Tóm tắt ngân sách ---
  EventBudgetSummaryResponse getBudgetSummary(UUID eventId);
}