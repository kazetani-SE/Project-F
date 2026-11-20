package com.projectf.features.finance.service.impl;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.finance.dto.request.CreateExpenseRequest;
import com.projectf.features.finance.dto.request.CreateReceiptRequest;
import com.projectf.features.finance.dto.request.ReviewExpenseRequest;
import com.projectf.features.finance.dto.request.UpdateExpenseRequest;
import com.projectf.features.finance.dto.response.ExpenseReceiptResponse;
import com.projectf.features.finance.dto.response.ExpenseResponse;
import com.projectf.features.finance.entity.BudgetItem;
import com.projectf.features.finance.entity.Expense;
import com.projectf.features.finance.entity.ExpenseReceipt;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.BudgetItemRepository;
import com.projectf.features.finance.repository.ExpenseReceiptRepository;
import com.projectf.features.finance.repository.ExpenseRepository;
import com.projectf.features.finance.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ExpenseServiceImpl implements ExpenseService {

  private static final String EXPENSE = "khoản chi";
  private static final String RECEIPT = "chứng từ";
  private static final String EVENT = "sự kiện";

  private final EventRepository eventRepo;
  private final BudgetItemRepository budgetItemRepo;
  private final ExpenseRepository expenseRepository;
  private final ExpenseReceiptRepository expReceiptRepo;
  private final FinanceMapper mapper;

  // ========================================================================
  // HELPERS
  // ========================================================================

  private static IllegalArgumentException notFound(String entity, UUID id) {
    return new IllegalArgumentException("Không tìm thấy " + entity + " với ID: " + id);
  }

  private void requireEvent(UUID eventId) {
    if (!eventRepo.existsById(eventId)) {
      throw notFound(EVENT, eventId);
    }
  }

  /** Event phải tồn tại và khoản chi phải thuộc đúng event này. */
  private Expense requireExpense(UUID eventId, UUID id) {
    requireEvent(eventId);
    return expenseRepository.findByIdAndEventId(id, eventId)
        .orElseThrow(() -> notFound(EXPENSE, id));
  }

  /**
   * Khoản chi gắn với hạng mục dự trù thì hạng mục đó phải thuộc cùng event
   * và đã APPROVED. budgetItemId null (chi phát sinh) thì bỏ qua.
   */
  private void assertBudgetItemApproved(UUID eventId, UUID budgetItemId) {
    if (budgetItemId != null) {
      BudgetItem item = budgetItemRepo.findByIdAndEventId(budgetItemId, eventId)
          .orElseThrow(() -> new IllegalArgumentException(
              "Hạng mục dự trù không tồn tại trong sự kiện này: " + budgetItemId));
      if (item.getApprovalStatus() != ApprovalStatus.APPROVED) {
        throw new IllegalArgumentException(
            "Hạng mục dự trù '" + item.getItemName() + "' chưa được duyệt (APPROVED), không thể chi tiêu.");
      }
    }
  }

  private List<ExpenseReceiptResponse> loadReceipts(UUID expenseId) {
    return expReceiptRepo.findByExpenseId(expenseId).stream()
        .map(mapper::toResponse)
        .toList();
  }

  /** Khoản chi đã APPROVED thì bị khóa: chỉ được thêm chứng từ. */
  private static void assertNotApproved(Expense expense, String action) {
    if (expense.getStatus() == ApprovalStatus.APPROVED) {
      throw new IllegalArgumentException(
          "Khoản chi đã được duyệt, không thể " + action + ". Chỉ được thêm chứng từ.");
    }
  }

  /**
   * Hạng mục dự trù liên kết (cùng event); null nếu là chi phát sinh hoặc không
   * tìm thấy.
   */
  private BudgetItem findLinkedItem(UUID eventId, UUID budgetItemId) {
    return budgetItemId == null ? null
        : budgetItemRepo.findByIdAndEventId(budgetItemId, eventId).orElse(null);
  }

  // ========================================================================
  // EXPENSE MANAGEMENT
  // ========================================================================

  @Override
  @Transactional(readOnly = true)
  public List<ExpenseResponse> getExpensesByEvent(UUID eventId, ApprovalStatus status) {
    requireEvent(eventId);
    List<Expense> expenses = (status != null)
        ? expenseRepository.findByEventIdAndStatus(eventId, status)
        : expenseRepository.findByEventId(eventId);

    return expenses.stream()
        .map(exp -> mapper.toResponse(exp, loadReceipts(exp.getId())))
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public ExpenseResponse getExpenseById(UUID eventId, UUID id) {
    Expense expense = requireExpense(eventId, id);
    return mapper.toResponse(expense, loadReceipts(expense.getId()),
        findLinkedItem(eventId, expense.getBudgetItemId()));
  }

  @Override
  public ExpenseResponse createExpense(UUID eventId, CreateExpenseRequest request) {
    requireEvent(eventId);
    assertBudgetItemApproved(eventId, request.budgetItemId());

    Expense savedExpense = expenseRepository.save(mapper.toEntity(eventId, request));

    List<ExpenseReceiptResponse> receiptResponses = (request.receipts() == null)
        ? List.of()
        : request.receipts().stream()
            .map(r -> mapper.toResponse(expReceiptRepo.save(mapper.toEntity(savedExpense.getId(), r))))
            .toList();

    return mapper.toResponse(savedExpense, receiptResponses);
  }

  @Override
  public ExpenseResponse updateExpense(UUID eventId, UUID id, UpdateExpenseRequest request) {
    Expense expense = requireExpense(eventId, id);
    assertNotApproved(expense, "cập nhật");

    if (request.budgetItemId() != null && !request.budgetItemId().equals(expense.getBudgetItemId())) {
      assertBudgetItemApproved(eventId, request.budgetItemId());
    }

    mapper.updateEntity(expense, request);
    Expense saved = expenseRepository.save(expense);
    return mapper.toResponse(saved, loadReceipts(id));
  }

  @Override
  public ExpenseResponse reviewExpense(UUID eventId, UUID id, ReviewExpenseRequest request) {
    Expense expense = requireExpense(eventId, id);
    assertNotApproved(expense, "duyệt lại hoặc đổi trạng thái");

    if (request.status() == ApprovalStatus.APPROVED) {
      // Bắt buộc có ít nhất 1 chứng từ trước khi APPROVED
      if (expReceiptRepo.countByExpenseId(id) == 0) {
        throw new IllegalArgumentException(
            "Khoản chi bắt buộc phải có ít nhất 1 chứng từ/hóa đơn trước khi phê duyệt (APPROVED).");
      }
      // Hạng mục dự trù liên kết phải đang APPROVED tại thời điểm duyệt chi
      assertBudgetItemApproved(eventId, expense.getBudgetItemId());
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
  public void deleteExpense(UUID eventId, UUID id) {
    Expense expense = requireExpense(eventId, id);
    assertNotApproved(expense, "xóa");
    expReceiptRepo.deleteByExpenseId(id);
    expenseRepository.delete(expense);
  }

  // ========================================================================
  // RECEIPT MANAGEMENT
  // ========================================================================

  @Override
  public ExpenseReceiptResponse addReceipt(UUID eventId, UUID expenseId, CreateReceiptRequest request) {
    requireExpense(eventId, expenseId);
    ExpenseReceipt receipt = mapper.toEntity(expenseId, request);
    return mapper.toResponse(expReceiptRepo.save(receipt));
  }

  @Override
  public void deleteReceipt(UUID eventId, UUID expenseId, UUID receiptId) {
    Expense expense = requireExpense(eventId, expenseId);
    assertNotApproved(expense, "xóa chứng từ");

    ExpenseReceipt receipt = expReceiptRepo.findById(receiptId)
        .orElseThrow(() -> notFound(RECEIPT, receiptId));
    if (!receipt.getExpenseId().equals(expenseId)) {
      throw new IllegalArgumentException("Chứng từ không thuộc về khoản chi ID: " + expenseId);
    }
    expReceiptRepo.deleteById(receiptId);
  }
}