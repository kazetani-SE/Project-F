package com.projectf.features.finance.service.impl;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.CreateExpenseRequest;
import com.projectf.features.finance.dto.request.CreateReceiptRequest;
import com.projectf.features.finance.dto.request.ReviewExpenseRequest;
import com.projectf.features.finance.dto.request.UpdateExpenseRequest;
import com.projectf.features.finance.dto.response.ExpenseReceiptResponse;
import com.projectf.features.finance.dto.response.ExpenseResponse;
import com.projectf.features.finance.entity.Expense;
import com.projectf.features.finance.entity.ExpenseReceipt;
import com.projectf.features.finance.mapper.FinanceMapper;
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

  private final ExpenseRepository expenseRepository;
  private final ExpenseReceiptRepository expReceiptRepo;
  private final FinanceMapper mapper;

  // ========================================================================
  // HELPERS
  // ========================================================================

  private static IllegalArgumentException notFound(String entity, UUID id) {
    return new IllegalArgumentException("Không tìm thấy " + entity + " với ID: " + id);
  }

  private List<ExpenseReceiptResponse> loadReceipts(UUID expenseId) {
    return expReceiptRepo.findByExpenseId(expenseId).stream()
            .map(mapper::toResponse)
            .toList();
  }

  // ========================================================================
  // EXPENSE MANAGEMENT
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
  // RECEIPT MANAGEMENT
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
}