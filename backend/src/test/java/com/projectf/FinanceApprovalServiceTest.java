package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.security.AccessService;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.service.EventService;
import com.projectf.features.finance.dto.request.ApprovalRequest;
import com.projectf.features.finance.entity.BudgetItem;
import com.projectf.features.finance.entity.Expense;
import com.projectf.features.finance.repository.BudgetItemRepository;
import com.projectf.features.finance.repository.ExpenseReceiptRepository;
import com.projectf.features.finance.repository.ExpenseRepository;
import com.projectf.features.finance.service.impl.FinanceServiceImpl;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceApprovalServiceTest {
    @Mock private BudgetItemRepository budgetRepository;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private ExpenseReceiptRepository receiptRepository;
    @Mock private EventService eventService;
    @Mock private AccessService access;
    @InjectMocks private FinanceServiceImpl service;

    @Test
    void rejectsBudgetThatExceedsAllocatedFund() {
        final UUID eventId = UUID.randomUUID();
        final UUID itemId = UUID.randomUUID();
        final BudgetItem item = new BudgetItem();
        item.setTotalEstimatedAmount(new BigDecimal("400"));
        final Event event = new Event();
        event.setAllocatedFund(new BigDecimal("1000"));
        when(budgetRepository.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.of(item));
        when(budgetRepository.sumApprovedExcept(eventId, itemId)).thenReturn(new BigDecimal("700"));
        when(eventService.lockEvent(eventId)).thenReturn(event);
        final IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.approveBudget(eventId, itemId, new ApprovalRequest(ApprovalStatus.APPROVED, null)));
        assertEquals("BUDGET_OVER_ALLOCATED", error.getMessage());
    }

    @Test
    void rejectsExpenseWithoutReceipt() {
        final UUID eventId = UUID.randomUUID();
        final UUID expenseId = UUID.randomUUID();
        final Expense expense = new Expense();
        expense.setTotalAmount(new BigDecimal("100"));
        final Event event = new Event();
        event.setAllocatedFund(new BigDecimal("1000"));
        when(expenseRepository.findByIdAndEventId(expenseId, eventId)).thenReturn(Optional.of(expense));
        when(receiptRepository.countByExpenseId(expenseId)).thenReturn(0L);
        when(expenseRepository.sumApprovedExcept(eventId, expenseId)).thenReturn(BigDecimal.ZERO);
        when(eventService.lockEvent(eventId)).thenReturn(event);
        final IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
                service.approveExpense(eventId, expenseId, new ApprovalRequest(ApprovalStatus.APPROVED, null)));
        assertEquals("EXPENSE_RECEIPT_REQUIRED", error.getMessage());
    }
}
