package com.projectf.features.finance.mapper;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.*;
import com.projectf.features.finance.dto.response.*;
import com.projectf.features.finance.entity.*;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
public class FinanceMapper {

    // --- BudgetCategory ---
    public BudgetCategory toEntity(CreateBudgetCategoryRequest request) {
        BudgetCategory entity = new BudgetCategory();
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        return entity;
    }

    public void updateEntity(BudgetCategory entity, UpdateBudgetCategoryRequest request) {
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
    }

    public BudgetCategoryResponse toResponse(BudgetCategory entity) {
        return new BudgetCategoryResponse(entity.getId(), entity.getName(), entity.getDescription());
    }

    // --- ItemPriceBenchmark ---
    public ItemPriceBenchmark toEntity(CreateBenchmarkRequest request) {
        ItemPriceBenchmark entity = new ItemPriceBenchmark();
        entity.setCategoryId(request.categoryId());
        entity.setItemName(request.itemName().trim());
        entity.setUnit(request.unit().trim());
        entity.setCurrentMarketPrice(request.currentMarketPrice());
        entity.setSupplierReference(request.supplierReference());
        return entity;
    }

    public void updateEntity(ItemPriceBenchmark entity, UpdateBenchmarkRequest request) {
        entity.setCategoryId(request.categoryId());
        entity.setItemName(request.itemName().trim());
        entity.setUnit(request.unit().trim());
        entity.setCurrentMarketPrice(request.currentMarketPrice());
        entity.setSupplierReference(request.supplierReference());
    }

    public BenchmarkResponse toResponse(ItemPriceBenchmark entity) {
        return new BenchmarkResponse(
            entity.getId(),
            entity.getCategoryId(),
            entity.getItemName(),
            entity.getUnit(),
            entity.getCurrentMarketPrice(),
            entity.getSupplierReference(),
            entity.getLastUpdatedAt()
        );
    }

    // --- BudgetItem ---
    public BudgetItem toEntity(CreateBudgetItemRequest request) {
        BudgetItem entity = new BudgetItem();
        entity.setEventId(request.eventId());
        entity.setCategoryId(request.categoryId());
        entity.setBenchmarkId(request.benchmarkId());
        entity.setMediaAsset(request.mediaAsset());
        entity.setItemName(request.itemName().trim());
        entity.setQuantity(request.quantity());
        entity.setUnit(request.unit().trim());
        entity.setEstimatedUnitPrice(request.estimatedUnitPrice());
        entity.setNotes(request.notes());
        entity.setApprovalStatus(ApprovalStatus.PENDING);
        return entity;
    }

    public void updateEntity(BudgetItem entity, UpdateBudgetItemRequest request) {
        entity.setCategoryId(request.categoryId());
        entity.setBenchmarkId(request.benchmarkId());
        entity.setMediaAsset(request.mediaAsset());
        entity.setItemName(request.itemName().trim());
        entity.setQuantity(request.quantity());
        entity.setUnit(request.unit().trim());
        entity.setEstimatedUnitPrice(request.estimatedUnitPrice());
        entity.setNotes(request.notes());
    }

    public BudgetItemResponse toResponse(BudgetItem entity) {
        return new BudgetItemResponse(
            entity.getId(),
            entity.getEventId(),
            entity.getCategoryId(),
            entity.getBenchmarkId(),
            entity.getMediaAsset(),
            entity.getItemName(),
            entity.getQuantity(),
            entity.getUnit(),
            entity.getEstimatedUnitPrice(),
            entity.getTotalEstimatedAmount(),
            entity.getNotes(),
            entity.getApprovalStatus(),
            entity.getApprovedBy(),
            entity.getApprovedAt(),
            entity.getRejectionReason(),
            entity.getCreatedAt()
        );
    }

    // --- Expense ---
    public Expense toEntity(CreateExpenseRequest request) {
        Expense entity = new Expense();
        entity.setEventId(request.eventId());
        entity.setBudgetItemId(request.budgetItemId());
        entity.setItemName(request.itemName().trim());
        entity.setQuantity(request.quantity());
        entity.setActualUnitPrice(request.actualUnitPrice());
        entity.setPaidBy(request.paidBy());
        entity.setPaymentDate(request.paymentDate());
        entity.setNotes(request.notes());
        entity.setStatus(ApprovalStatus.PENDING);
        return entity;
    }

    public void updateEntity(Expense entity, UpdateExpenseRequest request) {
        entity.setBudgetItemId(request.budgetItemId());
        entity.setItemName(request.itemName().trim());
        entity.setQuantity(request.quantity());
        entity.setActualUnitPrice(request.actualUnitPrice());
        entity.setPaidBy(request.paidBy());
        entity.setPaymentDate(request.paymentDate());
        entity.setNotes(request.notes());
    }

    public ExpenseResponse toResponse(Expense entity, List<ExpenseReceiptResponse> receipts) {
        return new ExpenseResponse(
            entity.getId(),
            entity.getEventId(),
            entity.getBudgetItemId(),
            entity.getItemName(),
            entity.getQuantity(),
            entity.getActualUnitPrice(),
            entity.getTotalAmount(),
            entity.getPaidBy(),
            entity.getStatus(),
            entity.getApprovedBy(),
            entity.getApprovedAt(),
            entity.getRejectionReason(),
            entity.getPaymentDate(),
            entity.getNotes(),
            entity.getCreatedAt(),
            receipts != null ? receipts : Collections.emptyList()
        );
    }

    // --- ExpenseReceipt ---
    public ExpenseReceipt toEntity(UUID expenseId, CreateReceiptRequest request) {
        ExpenseReceipt entity = new ExpenseReceipt();
        entity.setExpenseId(expenseId);
        entity.setReceiptCode(request.receiptCode());
        entity.setImageUrl(request.imageUrl().trim());
        entity.setSupplierName(request.supplierName());
        return entity;
    }

    public ExpenseReceiptResponse toResponse(ExpenseReceipt entity) {
        return new ExpenseReceiptResponse(
            entity.getId(),
            entity.getExpenseId(),
            entity.getReceiptCode(),
            entity.getImageUrl(),
            entity.getSupplierName(),
            entity.getCreatedAt()
        );
    }

    // --- Views ---
    public EventBudgetSummaryResponse toResponse(EventBudgetSummaryView view) {
        return new EventBudgetSummaryResponse(
            view.getEventId(),
            view.getEventTitle(),
            view.getSeasonName(),
            view.getAllocatedFund(),
            view.getTotalBudgetEstimated(),
            view.getTotalActualSpent(),
            view.getRemainingAllocatedFund(),
            view.getVarianceAgainstEstimate()
        );
    }

    public ProjectedBudgetResponse toResponse(ProjectedBudgetView view) {
        return new ProjectedBudgetResponse(
            view.getPreviousBudgetItemId(),
            view.getPreviousEventId(),
            view.getCategoryId(),
            view.getBenchmarkId(),
            view.getItemName(),
            view.getUnit(),
            view.getPreviousPlannedQty(),
            view.getBaseQuantityForProjection(),
            view.getPreviousUnitPrice(),
            view.getCurrentAdjustedUnitPrice(),
            view.getProjectedCurrentCost()
        );
    }
}
