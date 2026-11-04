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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FinanceServiceImpl implements FinanceService {

    private final BudgetCategoryRepository categoryRepository;
    private final ItemPriceBenchmarkRepository benchmarkRepository;
    private final BudgetItemRepository budgetItemRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseReceiptRepository expenseReceiptRepository;
    private final EventBudgetSummaryViewRepository summaryViewRepository;
    private final ProjectedBudgetViewRepository projectedViewRepository;
    private final FinanceMapper mapper;

    // ========================================================================
    // 1. DANH MỤC KINH PHÍ (BUDGET CATEGORIES)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BudgetCategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
            .map(mapper::toResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetCategoryResponse getCategoryById(UUID id) {
        return categoryRepository.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục kinh phí với ID: " + id));
    }

    @Override
    public BudgetCategoryResponse createCategory(CreateBudgetCategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new IllegalArgumentException("Danh mục kinh phí với tên '" + request.name().trim() + "' đã tồn tại.");
        }
        BudgetCategory entity = mapper.toEntity(request);
        return mapper.toResponse(categoryRepository.save(entity));
    }

    @Override
    public BudgetCategoryResponse updateCategory(UUID id, UpdateBudgetCategoryRequest request) {
        BudgetCategory entity = categoryRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục kinh phí với ID: " + id));

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new IllegalArgumentException("Danh mục kinh phí khác với tên '" + request.name().trim() + "' đã tồn tại.");
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(categoryRepository.save(entity));
    }

    @Override
    public void deleteCategory(UUID id) {
        if (!categoryRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy danh mục kinh phí với ID: " + id);
        }
        categoryRepository.deleteById(id);
    }

    // ========================================================================
    // 2. BẢNG THAM CHIẾU GIÁ THỊ TRƯỜNG (BENCHMARKS)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BenchmarkResponse> getAllBenchmarks(UUID categoryId, String keyword) {
        List<ItemPriceBenchmark> list;
        if (categoryId != null) {
            list = benchmarkRepository.findByCategoryId(categoryId);
        } else if (keyword != null && !keyword.isBlank()) {
            list = benchmarkRepository.findByItemNameContainingIgnoreCase(keyword.trim());
        } else {
            list = benchmarkRepository.findAll();
        }
        return list.stream().map(mapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BenchmarkResponse getBenchmarkById(UUID id) {
        return benchmarkRepository.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn giá tham chiếu với ID: " + id));
    }

    @Override
    public BenchmarkResponse createBenchmark(CreateBenchmarkRequest request) {
        if (!categoryRepository.existsById(request.categoryId())) {
            throw new IllegalArgumentException("Danh mục kinh phí liên kết không tồn tại: " + request.categoryId());
        }
        if (benchmarkRepository.existsByItemNameIgnoreCaseAndUnitIgnoreCase(request.itemName().trim(), request.unit().trim())) {
            throw new IllegalArgumentException("Đơn giá benchmark cho '" + request.itemName().trim() + "' với đơn vị '" + request.unit().trim() + "' đã tồn tại.");
        }
        ItemPriceBenchmark entity = mapper.toEntity(request);
        return mapper.toResponse(benchmarkRepository.save(entity));
    }

    @Override
    public BenchmarkResponse updateBenchmark(UUID id, UpdateBenchmarkRequest request) {
        ItemPriceBenchmark entity = benchmarkRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn giá tham chiếu với ID: " + id));

        if (!categoryRepository.existsById(request.categoryId())) {
            throw new IllegalArgumentException("Danh mục kinh phí liên kết không tồn tại: " + request.categoryId());
        }
        if (benchmarkRepository.existsByItemNameIgnoreCaseAndUnitIgnoreCaseAndIdNot(request.itemName().trim(), request.unit().trim(), id)) {
            throw new IllegalArgumentException("Đơn giá benchmark khác cho '" + request.itemName().trim() + "' với đơn vị '" + request.unit().trim() + "' đã tồn tại.");
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(benchmarkRepository.save(entity));
    }

    @Override
    public void deleteBenchmark(UUID id) {
        if (!benchmarkRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy đơn giá tham chiếu với ID: " + id);
        }
        benchmarkRepository.deleteById(id);
    }

    // ========================================================================
    // 3. DỰ TRÙ KINH PHÍ CHI TIẾT (BUDGET ITEMS)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<BudgetItemResponse> getBudgetItemsByEvent(UUID eventId, ApprovalStatus status) {
        List<BudgetItem> list = (status != null)
            ? budgetItemRepository.findByEventIdAndApprovalStatus(eventId, status)
            : budgetItemRepository.findByEventId(eventId);
        return list.stream().map(mapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetItemResponse getBudgetItemById(UUID id) {
        return budgetItemRepository.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hạng mục dự trù với ID: " + id));
    }

    @Override
    public BudgetItemResponse createBudgetItem(CreateBudgetItemRequest request) {
        if (!categoryRepository.existsById(request.categoryId())) {
            throw new IllegalArgumentException("Danh mục kinh phí không tồn tại: " + request.categoryId());
        }
        BudgetItem entity = mapper.toEntity(request);
        return mapper.toResponse(budgetItemRepository.save(entity));
    }

    @Override
    public BudgetItemResponse updateBudgetItem(UUID id, UpdateBudgetItemRequest request) {
        BudgetItem entity = budgetItemRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hạng mục dự trù với ID: " + id));

        if (!categoryRepository.existsById(request.categoryId())) {
            throw new IllegalArgumentException("Danh mục kinh phí không tồn tại: " + request.categoryId());
        }
        mapper.updateEntity(entity, request);
        return mapper.toResponse(budgetItemRepository.save(entity));
    }

    @Override
    public BudgetItemResponse reviewBudgetItem(UUID id, ReviewBudgetItemRequest request) {
        BudgetItem entity = budgetItemRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hạng mục dự trù với ID: " + id));

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
        return mapper.toResponse(budgetItemRepository.save(entity));
    }

    @Override
    public void deleteBudgetItem(UUID id) {
        if (!budgetItemRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy hạng mục dự trù với ID: " + id);
        }
        budgetItemRepository.deleteById(id);
    }

    // ========================================================================
    // 4. DỰ TOÁN TỰ ĐỘNG TỪ MÙA TRƯỚC (AUTO-PROJECTION)
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ProjectedBudgetResponse> getProjectedBudgetPreview(UUID previousEventId) {
        return projectedViewRepository.findByPreviousEventId(previousEventId).stream()
            .map(mapper::toResponse)
            .toList();
    }

    @Override
    public List<BudgetItemResponse> autoProjectFromPreviousSeason(AutoProjectBudgetRequest request) {
        List<ProjectedBudgetView> projections = projectedViewRepository.findByPreviousEventId(request.previousEventId());
        if (projections.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy dữ liệu dự trù/thực chi đã duyệt ở mùa trước với ID: " + request.previousEventId());
        }

        List<BudgetItem> itemsToSave = new ArrayList<>();
        for (ProjectedBudgetView p : projections) {
            BudgetItem item = new BudgetItem();
            item.setEventId(request.targetEventId());
            item.setCategoryId(p.getCategoryId());
            item.setBenchmarkId(p.getBenchmarkId());
            item.setItemName(p.getItemName());
            item.setUnit(p.getUnit());
            item.setQuantity(p.getBaseQuantityForProjection() != null ? p.getBaseQuantityForProjection() : BigDecimal.ONE);
            item.setEstimatedUnitPrice(p.getCurrentAdjustedUnitPrice() != null ? p.getCurrentAdjustedUnitPrice() : BigDecimal.ZERO);
            item.setNotes("Dự toán tự động kế thừa từ mùa trước (Sự kiện ID: " + request.previousEventId() + ")");
            item.setApprovalStatus(ApprovalStatus.PENDING);
            itemsToSave.add(item);
        }

        List<BudgetItem> saved = budgetItemRepository.saveAll(itemsToSave);
        return saved.stream().map(mapper::toResponse).toList();
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

        return expenses.stream().map(exp -> {
            List<ExpenseReceiptResponse> receipts = expenseReceiptRepository.findByExpenseId(exp.getId()).stream()
                .map(mapper::toResponse)
                .toList();
            return mapper.toResponse(exp, receipts);
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(UUID id) {
        Expense expense = expenseRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoản chi với ID: " + id));
        List<ExpenseReceiptResponse> receipts = expenseReceiptRepository.findByExpenseId(expense.getId()).stream()
            .map(mapper::toResponse)
            .toList();
        return mapper.toResponse(expense, receipts);
    }

    @Override
    public ExpenseResponse createExpense(CreateExpenseRequest request) {
        Expense expense = mapper.toEntity(request);
        Expense savedExpense = expenseRepository.save(expense);

        List<ExpenseReceiptResponse> receiptResponses = new ArrayList<>();
        if (request.receipts() != null && !request.receipts().isEmpty()) {
            for (CreateReceiptRequest r : request.receipts()) {
                ExpenseReceipt receipt = mapper.toEntity(savedExpense.getId(), r);
                receiptResponses.add(mapper.toResponse(expenseReceiptRepository.save(receipt)));
            }
        }
        return mapper.toResponse(savedExpense, receiptResponses);
    }

    @Override
    public ExpenseResponse updateExpense(UUID id, UpdateExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoản chi với ID: " + id));

        mapper.updateEntity(expense, request);
        Expense saved = expenseRepository.save(expense);
        List<ExpenseReceiptResponse> receipts = expenseReceiptRepository.findByExpenseId(id).stream()
            .map(mapper::toResponse)
            .toList();
        return mapper.toResponse(saved, receipts);
    }

    @Override
    public ExpenseResponse reviewExpense(UUID id, ReviewExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoản chi với ID: " + id));

        // RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC:
        // Khoản chi (expenses) bắt buộc có ít nhất 1 chứng từ (expense_receipts) trước khi chuyển sang APPROVED.
        if (request.status() == ApprovalStatus.APPROVED) {
            long receiptCount = expenseReceiptRepository.countByExpenseId(id);
            if (receiptCount == 0) {
                throw new IllegalArgumentException("Khoản chi bắt buộc phải có ít nhất 1 chứng từ/hóa đơn trước khi phê duyệt (APPROVED).");
            }
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
        List<ExpenseReceiptResponse> receipts = expenseReceiptRepository.findByExpenseId(id).stream()
            .map(mapper::toResponse)
            .toList();
        return mapper.toResponse(saved, receipts);
    }

    @Override
    public void deleteExpense(UUID id) {
        if (!expenseRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy khoản chi với ID: " + id);
        }
        expenseReceiptRepository.deleteByExpenseId(id);
        expenseRepository.deleteById(id);
    }

    // ========================================================================
    // 6. HÓA ĐƠN & CHỨNG TỪ (RECEIPTS)
    // ========================================================================

    @Override
    public ExpenseReceiptResponse addReceipt(UUID expenseId, CreateReceiptRequest request) {
        if (!expenseRepository.existsById(expenseId)) {
            throw new IllegalArgumentException("Không tìm thấy khoản chi liên kết với ID: " + expenseId);
        }
        ExpenseReceipt receipt = mapper.toEntity(expenseId, request);
        return mapper.toResponse(expenseReceiptRepository.save(receipt));
    }

    @Override
    public void deleteReceipt(UUID expenseId, UUID receiptId) {
        ExpenseReceipt receipt = expenseReceiptRepository.findById(receiptId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chứng từ với ID: " + receiptId));

        if (!receipt.getExpenseId().equals(expenseId)) {
            throw new IllegalArgumentException("Chứng từ không thuộc về khoản chi ID: " + expenseId);
        }
        expenseReceiptRepository.deleteById(receiptId);
    }

    // ========================================================================
    // 7. REAL-TIME BUDGET DASHBOARD SUMMARY
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public EventBudgetSummaryResponse getBudgetSummary(UUID eventId) {
        return summaryViewRepository.findById(eventId)
            .map(mapper::toResponse)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dữ liệu tổng hợp ngân sách cho sự kiện ID: " + eventId));
    }
}

