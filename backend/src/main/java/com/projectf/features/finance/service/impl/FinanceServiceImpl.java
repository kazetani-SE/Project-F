package com.projectf.features.finance.service.impl;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.*;
import com.projectf.features.finance.dto.response.*;
import com.projectf.features.finance.entity.*;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.*;
import com.projectf.features.finance.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FinanceServiceImpl implements FinanceService {

    private static final String CATEGORY = "danh mục kinh phí";
    private static final String BENCHMARK = "đơn giá tham chiếu";
    private static final String BUDGET_ITEM = "hạng mục dự trù";
    private static final String EXPENSE = "khoản chi";
    private static final String RECEIPT = "chứng từ";

    private final BudgetCategoryRepository categoryRepo;
    private final ItemPriceBenchmarkRepository benchmarkRepo;
    private final BudgetItemRepository budgetItemRepo;
    private final ExpenseRepository expenseRepository;
    private final ExpenseReceiptRepository expReceiptRepo;
    private final EventBudgetSummaryViewRepository summaryViewRepo;
    private final ProjectedBudgetViewRepository projectedViewRepo;
    private final FinanceMapper mapper;

    // ========================================================================
    // HELPERS
    // ========================================================================

    private static IllegalArgumentException notFound(String entity, UUID id) {
        return new IllegalArgumentException("Không tìm thấy " + entity + " với ID: " + id);
    }

    private static IllegalArgumentException alreadyExists(String detail) {
        return new IllegalArgumentException(detail + " đã tồn tại.");
    }

    private static IllegalArgumentException linkedNotExist(String entity, UUID id) {
        return new IllegalArgumentException(entity + " không tồn tại: " + id);
    }

    private List<ExpenseReceiptResponse> loadReceipts(UUID expenseId) {
        return expReceiptRepo.findByExpenseId(expenseId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    // ========================================================================
    // 1. DANH MỤC KINH PHÍ (BUDGET CATEGORIES)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BudgetCategoryResponse> getAllCategories() {
        return categoryRepo.findAll().stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetCategoryResponse getCategoryById(UUID id) {
        return categoryRepo.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> notFound(CATEGORY, id));
    }

    @Override
    public BudgetCategoryResponse createCategory(CreateBudgetCategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepo.existsByNameIgnoreCase(name)) {
            throw alreadyExists("Danh mục kinh phí với tên '" + name + "'");
        }
        BudgetCategory entity = mapper.toEntity(request);
        return mapper.toResponse(categoryRepo.save(entity));
    }

    @Override
    public BudgetCategoryResponse updateCategory(UUID id, UpdateBudgetCategoryRequest request) {
        BudgetCategory entity = categoryRepo.findById(id)
                .orElseThrow(() -> notFound(CATEGORY, id));

        String name = request.name().trim();
        if (categoryRepo.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw alreadyExists("Danh mục kinh phí khác với tên '" + name + "'");
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(categoryRepo.save(entity));
    }

    @Override
    public void deleteCategory(UUID id) {
        if (!categoryRepo.existsById(id)) {
            throw notFound(CATEGORY, id);
        }
        categoryRepo.deleteById(id);
    }

    // ========================================================================
    // 2. BẢNG THAM CHIẾU GIÁ THỊ TRƯỜNG (BENCHMARKS)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BenchmarkResponse> getAllBenchmarks(UUID categoryId, String keyword) {
        List<ItemPriceBenchmark> list;
        if (categoryId != null) {
            list = benchmarkRepo.findByCategoryId(categoryId);
        } else if (keyword != null && !keyword.isBlank()) {
            list = benchmarkRepo.findByItemNameContainingIgnoreCase(keyword.trim());
        } else {
            list = benchmarkRepo.findAll();
        }
        return list.stream().map(mapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BenchmarkResponse getBenchmarkById(UUID id) {
        return benchmarkRepo.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> notFound(BENCHMARK, id));
    }

    @Override
    public BenchmarkResponse createBenchmark(CreateBenchmarkRequest request) {
        if (!categoryRepo.existsById(request.categoryId())) {
            throw linkedNotExist("Danh mục kinh phí liên kết", request.categoryId());
        }
        String itemName = request.itemName().trim();
        String unit = request.unit().trim();
        if (benchmarkRepo.existsByItemNameIgnoreCaseAndUnitIgnoreCase(itemName, unit)) {
            throw alreadyExists("Đơn giá benchmark cho '" + itemName + "' với đơn vị '" + unit + "'");
        }
        ItemPriceBenchmark entity = mapper.toEntity(request);
        return mapper.toResponse(benchmarkRepo.save(entity));
    }

    @Override
    public BenchmarkResponse updateBenchmark(UUID id, UpdateBenchmarkRequest request) {
        ItemPriceBenchmark entity = benchmarkRepo.findById(id)
                .orElseThrow(() -> notFound(BENCHMARK, id));

        if (!categoryRepo.existsById(request.categoryId())) {
            throw linkedNotExist("Danh mục kinh phí liên kết", request.categoryId());
        }
        String itemName = request.itemName().trim();
        String unit = request.unit().trim();
        if (benchmarkRepo.existsByItemNameIgnoreCaseAndUnitIgnoreCaseAndIdNot(itemName, unit, id)) {
            throw alreadyExists("Đơn giá benchmark khác cho '" + itemName + "' với đơn vị '" + unit + "'");
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(benchmarkRepo.save(entity));
    }

    @Override
    public void deleteBenchmark(UUID id) {
        if (!benchmarkRepo.existsById(id)) {
            throw notFound(BENCHMARK, id);
        }
        benchmarkRepo.deleteById(id);
    }

    // ========================================================================
    // 3. DỰ TRÙ KINH PHÍ CHI TIẾT (BUDGET ITEMS)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BudgetItemResponse> getBudgetItemsByEvent(UUID eventId, ApprovalStatus status) {
        List<BudgetItem> list = (status != null)
                ? budgetItemRepo.findByEventIdAndApprovalStatus(eventId, status)
                : budgetItemRepo.findByEventId(eventId);
        return list.stream().map(mapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetItemResponse getBudgetItemById(UUID id) {
        return budgetItemRepo.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> notFound(BUDGET_ITEM, id));
    }

    @Override
    public BudgetItemResponse createBudgetItem(CreateBudgetItemRequest request) {
        if (!categoryRepo.existsById(request.categoryId())) {
            throw linkedNotExist("Danh mục kinh phí", request.categoryId());
        }
        BudgetItem entity = mapper.toEntity(request);
        return mapper.toResponse(budgetItemRepo.save(entity));
    }

    @Override
    public BudgetItemResponse updateBudgetItem(UUID id, UpdateBudgetItemRequest request) {
        BudgetItem entity = budgetItemRepo.findById(id)
                .orElseThrow(() -> notFound(BUDGET_ITEM, id));

        if (!categoryRepo.existsById(request.categoryId())) {
            throw linkedNotExist("Danh mục kinh phí", request.categoryId());
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(budgetItemRepo.save(entity));
    }

    @Override
    public BudgetItemResponse reviewBudgetItem(UUID id, ReviewBudgetItemRequest request) {
        BudgetItem entity = budgetItemRepo.findById(id)
                .orElseThrow(() -> notFound(BUDGET_ITEM, id));

        entity.setApprovalStatus(request.status());
        if (request.status() == ApprovalStatus.APPROVED) {
            entity.setApprovedBy(request.approvedBy());
            entity.setApprovedAt(OffsetDateTime.now());
            entity.setRejectionReason(null);
        } else if (request.status() == ApprovalStatus.REJECTED) {
            entity.setApprovedBy(request.approvedBy());
            entity.setApprovedAt(OffsetDateTime.now());
            entity.setRejectionReason(request.rejectionReason());
        }
        return mapper.toResponse(budgetItemRepo.save(entity));
    }

    @Override
    public void deleteBudgetItem(UUID id) {
        if (!budgetItemRepo.existsById(id)) {
            throw notFound(BUDGET_ITEM, id);
        }
        budgetItemRepo.deleteById(id);
    }

    // ========================================================================
    // 4. DỰ TOÁN TỰ ĐỘNG TỪ MÙA TRƯỚC (AUTO-PROJECTION)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ProjectedBudgetResponse> getProjectedBudgetPreview(UUID previousEventId) {
        return projectedViewRepo.findByPreviousEventId(previousEventId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    public List<BudgetItemResponse> autoProjectFromPreviousSeason(AutoProjectBudgetRequest request) {
        List<ProjectedBudgetView> projections = projectedViewRepo.findByPreviousEventId(request.previousEventId());
        if (projections.isEmpty()) {
            throw notFound("dữ liệu dự trù/thực chi đã duyệt ở mùa trước", request.previousEventId());
        }

        List<BudgetItem> itemsToSave = projections.stream()
                .map(p -> buildProjectedItem(p, request))
                .toList();

        return budgetItemRepo.saveAll(itemsToSave).stream()
                .map(mapper::toResponse)
                .toList();
    }

    private BudgetItem buildProjectedItem(ProjectedBudgetView budgetView, AutoProjectBudgetRequest request) {
        BudgetItem item = new BudgetItem();
        item.setEventId(request.targetEventId());
        item.setCategoryId(budgetView.getCategoryId());
        item.setBenchmarkId(budgetView.getBenchmarkId());
        item.setItemName(budgetView.getItemName());
        item.setUnit(budgetView.getUnit());
        item.setQuantity(budgetView.getBaseProjectionQty() != null ? budgetView.getBaseProjectionQty() : BigDecimal.ONE);
        item.setEstUnitPrice(budgetView.getAdjustedUnitPrice() != null ? budgetView.getAdjustedUnitPrice() : BigDecimal.ZERO);
        item.setNotes("Dự toán tự động kế thừa từ mùa trước (Sự kiện ID: " + request.previousEventId() + ")");
        item.setApprovalStatus(ApprovalStatus.PENDING);
        return item;
    }

    // ========================================================================
    // 5. CHI TIÊU THỰC TẾ & DUYỆT CHI (EXPENSES & RECEIPTS)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpensesByEvent(UUID eventId, ApprovalStatus status) {
        List<Expense> expenses = (status != null)
                ? expenseRepository.findByEventIdAndStatus(eventId, status)
                : expenseRepository.findByEventId(eventId);

        return expenses.stream()
                .map(exp -> mapper.toResponse(exp, loadReceipts(exp.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> notFound(EXPENSE, id));
        return mapper.toResponse(expense, loadReceipts(expense.getId()));
    }

    @Override
    public ExpenseResponse createExpense(CreateExpenseRequest request) {
        Expense savedExpense = expenseRepository.save(mapper.toEntity(request));

        List<ExpenseReceiptResponse> receiptResponses = (request.receipts() == null)
                ? List.of()
                : request.receipts().stream()
                .map(r -> mapper.toResponse(expReceiptRepo.save(mapper.toEntity(savedExpense.getId(), r))))
                .toList();

        return mapper.toResponse(savedExpense, receiptResponses);
    }

    @Override
    public ExpenseResponse updateExpense(UUID id, UpdateExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> notFound(EXPENSE, id));

        mapper.updateEntity(expense, request);
        Expense saved = expenseRepository.save(expense);
        return mapper.toResponse(saved, loadReceipts(id));
    }

    @Override
    public ExpenseResponse reviewExpense(UUID id, ReviewExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> notFound(EXPENSE, id));

        // RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC:
        // Khoản chi (expenses) bắt buộc có ít nhất 1 chứng từ (expense_receipts) trước khi chuyển sang APPROVED.
        if (request.status() == ApprovalStatus.APPROVED && expReceiptRepo.countByExpenseId(id) == 0) {
            throw new IllegalArgumentException("Khoản chi bắt buộc phải có ít nhất 1 chứng từ/hóa đơn trước khi phê duyệt (APPROVED).");
        }

        expense.setStatus(request.status());
        if (request.status() == ApprovalStatus.APPROVED) {
            expense.setApprovedBy(request.approvedBy());
            expense.setApprovedAt(OffsetDateTime.now());
            expense.setRejectionReason(null);
        } else if (request.status() == ApprovalStatus.REJECTED) {
            expense.setApprovedBy(request.approvedBy());
            expense.setApprovedAt(OffsetDateTime.now());
            expense.setRejectionReason(request.rejectionReason());
        }

        Expense saved = expenseRepository.save(expense);
        return mapper.toResponse(saved, loadReceipts(id));
    }

    @Override
    public void deleteExpense(UUID id) {
        if (!expenseRepository.existsById(id)) {
            throw notFound(EXPENSE, id);
        }
        expReceiptRepo.deleteByExpenseId(id);
        expenseRepository.deleteById(id);
    }

    // ========================================================================
    // 6. HÓA ĐƠN & CHỨNG TỪ (RECEIPTS)
    // ========================================================================

    @Override
    public ExpenseReceiptResponse addReceipt(UUID expenseId, CreateReceiptRequest request) {
        if (!expenseRepository.existsById(expenseId)) {
            throw notFound(EXPENSE + " liên kết", expenseId);
        }
        ExpenseReceipt receipt = mapper.toEntity(expenseId, request);
        return mapper.toResponse(expReceiptRepo.save(receipt));
    }

    @Override
    public void deleteReceipt(UUID expenseId, UUID receiptId) {
        ExpenseReceipt receipt = expReceiptRepo.findById(receiptId)
                .orElseThrow(() -> notFound(RECEIPT, receiptId));

        if (!receipt.getExpenseId().equals(expenseId)) {
            throw new IllegalArgumentException("Chứng từ không thuộc về khoản chi ID: " + expenseId);
        }
        expReceiptRepo.deleteById(receiptId);
    }

    // ========================================================================
    // 7. REAL-TIME BUDGET DASHBOARD SUMMARY
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public EventBudgetSummaryResponse getBudgetSummary(UUID eventId) {
        return summaryViewRepo.findById(eventId)
                .map(mapper::toResponse)
                .orElseThrow(() -> notFound("dữ liệu tổng hợp ngân sách cho sự kiện", eventId));
    }
}