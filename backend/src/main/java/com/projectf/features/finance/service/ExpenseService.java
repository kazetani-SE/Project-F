package com.projectf.features.finance.service;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.CreateExpenseRequest;
import com.projectf.features.finance.dto.request.CreateReceiptRequest;
import com.projectf.features.finance.dto.request.ReviewExpenseRequest;
import com.projectf.features.finance.dto.request.UpdateExpenseRequest;
import com.projectf.features.finance.dto.response.ExpenseReceiptResponse;
import com.projectf.features.finance.dto.response.ExpenseResponse;

import java.util.List;
import java.util.UUID;

public interface ExpenseService {
  // Expense management
  List<ExpenseResponse> getExpensesByEvent(UUID eventId, ApprovalStatus status);
  ExpenseResponse getExpenseById(UUID id);
  ExpenseResponse createExpense(CreateExpenseRequest request);
  ExpenseResponse updateExpense(UUID id, UpdateExpenseRequest request);
  ExpenseResponse reviewExpense(UUID id, ReviewExpenseRequest request);
  void deleteExpense(UUID id);

  // Receipt management
  ExpenseReceiptResponse addReceipt(UUID expenseId, CreateReceiptRequest request);
  void deleteReceipt(UUID expenseId, UUID receiptId);
}