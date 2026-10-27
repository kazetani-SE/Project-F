package com.projectf.features.finance.mapper;

import com.projectf.features.event.entity.Event;
import com.projectf.features.finance.dto.request.BenchmarkRequest;
import com.projectf.features.finance.dto.request.BudgetItemRequest;
import com.projectf.features.finance.dto.request.CategoryRequest;
import com.projectf.features.finance.dto.request.ExpenseRequest;
import com.projectf.features.finance.dto.request.ReceiptRequest;
import com.projectf.features.finance.dto.response.BenchmarkResponse;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.dto.response.BudgetSummaryResponse;
import com.projectf.features.finance.dto.response.CategoryResponse;
import com.projectf.features.finance.dto.response.ExpenseResponse;
import com.projectf.features.finance.dto.response.ProjectedBudgetResponse;
import com.projectf.features.finance.dto.response.ReceiptResponse;
import com.projectf.features.finance.entity.BudgetCategory;
import com.projectf.features.finance.entity.BudgetItem;
import com.projectf.features.finance.entity.BudgetSummaryView;
import com.projectf.features.finance.entity.Expense;
import com.projectf.features.finance.entity.ExpenseReceipt;
import com.projectf.features.finance.entity.ItemPriceBenchmark;
import com.projectf.features.finance.entity.ProjectedBudgetView;
import com.projectf.features.knowledge.entity.EventMediaAsset;
import com.projectf.features.member.entity.ClubMember;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class FinanceMapper {
    public CategoryResponse toResponse(final BudgetCategory item) {
        return new CategoryResponse(item.getId(), item.getName(), item.getDescription());
    }
    public BenchmarkResponse toResponse(final ItemPriceBenchmark item) {
        return new BenchmarkResponse(item.getId(), item.getCategory().getId(), item.getItemName(),
                item.getUnit(), item.getCurrentMarketPrice(), item.getSupplierReference(),
                item.getLastUpdatedAt());
    }
    public BudgetItemResponse toResponse(final BudgetItem item) {
        return new BudgetItemResponse(item.getId(), item.getEvent().getId(), item.getCategory().getId(),
                item.getBenchmark() == null ? null : item.getBenchmark().getId(), item.getItemName(),
                item.getMediaAsset() == null ? null : item.getMediaAsset().getId(), item.getQuantity(),
                item.getUnit(), item.getEstimatedUnitPrice(), item.getTotalEstimatedAmount(), item.getNotes(),
                item.getApprovalStatus(), item.getApprovedBy() == null ? null : item.getApprovedBy().getId(),
                item.getApprovedAt(), item.getRejectionReason(), item.getCreatedAt());
    }
    public ReceiptResponse toResponse(final ExpenseReceipt item) {
        return new ReceiptResponse(item.getId(), item.getExpense().getId(), item.getReceiptCode(),
                item.getImageUrl(), item.getSupplierName(), item.getCreatedAt());
    }
    public ExpenseResponse toResponse(final Expense item, final List<ReceiptResponse> receipts) {
        return new ExpenseResponse(item.getId(), item.getEvent().getId(),
                item.getBudgetItem() == null ? null : item.getBudgetItem().getId(), item.getItemName(),
                item.getQuantity(), item.getActualUnitPrice(), item.getTotalAmount(), item.getPaidBy().getId(),
                item.getStatus(), item.getApprovedBy() == null ? null : item.getApprovedBy().getId(),
                item.getApprovedAt(), item.getRejectionReason(), item.getPaymentDate(), item.getNotes(),
                item.getCreatedAt(), receipts);
    }
    public BudgetSummaryResponse toResponse(final BudgetSummaryView item) {
        return new BudgetSummaryResponse(item.getEventId(), item.getEventTitle(), item.getSeasonName(),
                item.getAllocatedFund(), item.getTotalBudgetEstimated(), item.getTotalActualSpent(),
                item.getRemainingAllocatedFund(), item.getVarianceAgainstEstimate());
    }
    public ProjectedBudgetResponse toResponse(final ProjectedBudgetView item) {
        return new ProjectedBudgetResponse(item.getPreviousEventId(), item.getPreviousBudgetItemId(),
                item.getCategoryId(), item.getBenchmarkId(), item.getItemName(), item.getUnit(),
                item.getPreviousPlannedQty(), item.getBaseQuantityForProjection(), item.getPreviousUnitPrice(),
                item.getCurrentAdjustedUnitPrice(), item.getProjectedCurrentCost());
    }
    public BudgetCategory create(final CategoryRequest request) {
        final BudgetCategory item = new BudgetCategory();
        item.setName(request.name()); item.setDescription(request.description());
        return item;
    }
    public ItemPriceBenchmark create(final BenchmarkRequest request, final BudgetCategory category) {
        final ItemPriceBenchmark item = new ItemPriceBenchmark();
        item.setCategory(category); item.setItemName(request.itemName()); item.setUnit(request.unit());
        item.setCurrentMarketPrice(request.currentMarketPrice());
        item.setSupplierReference(request.supplierReference());
        return item;
    }
    public BudgetItem create(final BudgetItemRequest request, final Event event,
            final BudgetCategory category, final ItemPriceBenchmark benchmark,
            final EventMediaAsset media) {
        final BudgetItem item = new BudgetItem();
        item.setEvent(event); item.setCategory(category); item.setBenchmark(benchmark);
        item.setItemName(request.itemName()); item.setMediaAsset(media);
        item.setQuantity(request.quantity()); item.setUnit(request.unit());
        item.setEstimatedUnitPrice(request.estimatedUnitPrice()); item.setNotes(request.notes());
        return item;
    }
    public Expense create(final ExpenseRequest request, final Event event,
            final BudgetItem budget, final ClubMember payer) {
        final Expense item = new Expense();
        item.setEvent(event); item.setBudgetItem(budget); item.setItemName(request.itemName());
        item.setQuantity(request.quantity()); item.setActualUnitPrice(request.actualUnitPrice());
        item.setPaidBy(payer); item.setPaymentDate(request.paymentDate()); item.setNotes(request.notes());
        return item;
    }
    public ExpenseReceipt create(final ReceiptRequest request, final Expense expense) {
        final ExpenseReceipt item = new ExpenseReceipt();
        item.setExpense(expense); item.setReceiptCode(request.receiptCode());
        item.setImageUrl(request.imageUrl()); item.setSupplierName(request.supplierName());
        return item;
    }
}
