package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.finance.dto.request.CreateExpenseRequest;
import com.projectf.features.finance.dto.request.CreateReceiptRequest;
import com.projectf.features.finance.dto.request.ReviewExpenseRequest;
import com.projectf.features.finance.dto.request.UpdateExpenseRequest;
import com.projectf.features.finance.entity.BudgetItem;
import com.projectf.features.finance.entity.Expense;
import com.projectf.features.finance.entity.ExpenseReceipt;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.BudgetItemRepository;
import com.projectf.features.finance.repository.ExpenseReceiptRepository;
import com.projectf.features.finance.repository.ExpenseRepository;
import com.projectf.features.finance.service.impl.ExpenseServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.Executable;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExpenseServiceTest {

    @Mock
    private EventRepository eventRepo;
    @Mock
    private BudgetItemRepository budgetItemRepo;
    @Mock
    private ExpenseRepository expenseRepo;
    @Mock
    private ExpenseReceiptRepository receiptRepo;
    @Mock
    private FinanceMapper mapper;

    private ExpenseServiceImpl service;

    private final UUID eventId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ExpenseServiceImpl(eventRepo, budgetItemRepo, expenseRepo, receiptRepo, mapper);
        when(eventRepo.existsById(eventId)).thenReturn(true);
        when(expenseRepo.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------------------------------------------------------------- helpers

    private Expense expense(ApprovalStatus status, UUID budgetItemId) {
        Expense e = new Expense();
        e.setId(UUID.randomUUID());
        e.setStatus(status);
        e.setBudgetItemId(budgetItemId);
        when(expenseRepo.findByIdAndEventId(e.getId(), eventId)).thenReturn(Optional.of(e));
        return e;
    }

    private UUID budgetItem(ApprovalStatus status) {
        BudgetItem item = new BudgetItem();
        UUID id = UUID.randomUUID();
        item.setId(id);
        item.setItemName("Standee A0");
        item.setApprovalStatus(status);
        when(budgetItemRepo.findByIdAndEventId(id, eventId)).thenReturn(Optional.of(item));
        return id;
    }

    private ExpenseReceipt receipt(UUID expenseId) {
        ExpenseReceipt r = new ExpenseReceipt();
        r.setId(UUID.randomUUID());
        r.setExpenseId(expenseId);
        return r;
    }

    private CreateReceiptRequest receiptReq() {
        return new CreateReceiptRequest("HD-001", "https://example.com/bill.jpg", "Nhà in F");
    }

    private CreateExpenseRequest createReq(UUID budgetItemId, List<CreateReceiptRequest> receipts) {
        return new CreateExpenseRequest(budgetItemId, "In ấn backdrop",
                BigDecimal.ONE, new BigDecimal("450000"), UUID.randomUUID(),
                LocalDate.of(2026, 11, 4), "ghi chú", receipts);
    }

    private UpdateExpenseRequest updateReq(UUID budgetItemId) {
        return new UpdateExpenseRequest(budgetItemId, "In ấn backdrop",
                BigDecimal.ONE, new BigDecimal("450000"), UUID.randomUUID(),
                LocalDate.of(2026, 11, 4), "ghi chú");
    }

    private IllegalArgumentException assertIllegalArg(Executable e) {
        return assertThrows(IllegalArgumentException.class, e);
    }

    // ------------------------------------------------------------------ event

    @Test
    void getExpensesThrowsWhenEventNotFound() {
        UUID missing = UUID.randomUUID();
        when(eventRepo.existsById(missing)).thenReturn(false);

        assertIllegalArg(() -> service.getExpensesByEvent(missing, null));
        verify(expenseRepo, never()).findByEventId(any());
    }

    @Test
    void getExpenseThrowsWhenExpenseBelongsToAnotherEvent() {
        UUID id = UUID.randomUUID();
        when(expenseRepo.findByIdAndEventId(id, eventId)).thenReturn(Optional.empty());

        assertIllegalArg(() -> service.getExpenseById(eventId, id));
    }

    // ----------------------------------------------------------------- create

    @Test
    void createExpenseThrowsWhenEventNotFound() {
        UUID missing = UUID.randomUUID();
        when(eventRepo.existsById(missing)).thenReturn(false);

        assertIllegalArg(() -> service.createExpense(missing, createReq(null, null)));
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void createExpenseRejectsBudgetItemOfAnotherEvent() {
        UUID itemId = UUID.randomUUID();
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.empty());

        var ex = assertIllegalArg(() -> service.createExpense(eventId, createReq(itemId, null)));

        assertTrue(ex.getMessage().contains("không tồn tại trong sự kiện"));
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void getExpenseByIdPassesLinkedBudgetItemToMapper() {
        BudgetItem item = new BudgetItem();
        item.setId(UUID.randomUUID());
        when(budgetItemRepo.findByIdAndEventId(item.getId(), eventId)).thenReturn(Optional.of(item));
        Expense e = expense(ApprovalStatus.PENDING, item.getId());

        service.getExpenseById(eventId, e.getId());

        verify(mapper).toResponse(eq(e), anyList(), eq(item));
    }

    @Test
    void getExpenseByIdForUnplannedExpenseSkipsBudgetItemLookup() {
        Expense e = expense(ApprovalStatus.PENDING, null);

        service.getExpenseById(eventId, e.getId());

        verify(mapper).toResponse(eq(e), anyList(), isNull());
        verify(budgetItemRepo, never()).findByIdAndEventId(any(), any());
    }

    @Test
    void getExpenseByIdReturnsNullBudgetItemWhenItemNotFoundInEvent() {
        UUID itemId = UUID.randomUUID();
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.empty());
        Expense e = expense(ApprovalStatus.PENDING, itemId);

        service.getExpenseById(eventId, e.getId());

        verify(mapper).toResponse(eq(e), anyList(), isNull());
    }

    @Test
    void createExpenseRejectsBudgetItemNotApproved() {
        UUID itemId = budgetItem(ApprovalStatus.PENDING);

        var ex = assertIllegalArg(() -> service.createExpense(eventId, createReq(itemId, null)));

        assertTrue(ex.getMessage().contains("chưa được duyệt"));
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void createExpenseSucceedsWithApprovedBudgetItemAndSavesReceipts() {
        UUID itemId = budgetItem(ApprovalStatus.APPROVED);
        Expense entity = new Expense();
        entity.setId(UUID.randomUUID());
        CreateReceiptRequest receiptReq = receiptReq();
        CreateExpenseRequest req = createReq(itemId, List.of(receiptReq));
        when(mapper.toEntity(eventId, req)).thenReturn(entity);
        when(mapper.toEntity(entity.getId(), receiptReq)).thenReturn(new ExpenseReceipt());
        when(receiptRepo.save(any(ExpenseReceipt.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createExpense(eventId, req);

        verify(expenseRepo).save(entity);
        verify(receiptRepo, times(1)).save(any(ExpenseReceipt.class));
    }

    @Test
    void createExpenseWithoutBudgetItemSkipsApprovalCheck() {
        Expense entity = new Expense();
        entity.setId(UUID.randomUUID());
        CreateExpenseRequest req = createReq(null, null);
        when(mapper.toEntity(eventId, req)).thenReturn(entity);

        service.createExpense(eventId, req);

        verify(expenseRepo).save(entity);
        verify(budgetItemRepo, never()).findByIdAndEventId(any(), any());
    }

    // ----------------------------------------------------------------- update

    @Test
    void updateExpenseRejectsApprovedExpense() {
        Expense e = expense(ApprovalStatus.APPROVED, null);

        var ex = assertIllegalArg(() -> service.updateExpense(eventId, e.getId(), updateReq(null)));

        assertTrue(ex.getMessage().contains("đã được duyệt"));
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void updateExpenseRejectsSwitchingToUnapprovedBudgetItem() {
        Expense e = expense(ApprovalStatus.PENDING, null);
        UUID newItem = budgetItem(ApprovalStatus.PENDING);

        assertIllegalArg(() -> service.updateExpense(eventId, e.getId(), updateReq(newItem)));
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void updateExpenseDoesNotRecheckBudgetItemWhenUnchanged() {
        UUID itemId = UUID.randomUUID(); // không stub: nếu bị kiểm tra sẽ báo không tồn tại
        Expense e = expense(ApprovalStatus.PENDING, itemId);
        UpdateExpenseRequest req = updateReq(itemId);

        service.updateExpense(eventId, e.getId(), req);

        verify(mapper).updateEntity(e, req);
        verify(expenseRepo).save(e);
        verify(budgetItemRepo, never()).findByIdAndEventId(any(), any());
    }

    // ----------------------------------------------------------------- review

    @Test
    void reviewExpenseRejectsAlreadyApprovedExpense() {
        Expense e = expense(ApprovalStatus.APPROVED, null);
        var req = new ReviewExpenseRequest(ApprovalStatus.REJECTED, UUID.randomUUID(), "Sai");

        var ex = assertIllegalArg(() -> service.reviewExpense(eventId, e.getId(), req));

        assertTrue(ex.getMessage().contains("đã được duyệt"));
        assertEquals(ApprovalStatus.APPROVED, e.getStatus());
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void reviewExpenseRejectsApproveWithoutReceipt() {
        Expense e = expense(ApprovalStatus.PENDING, null);
        when(receiptRepo.countByExpenseId(e.getId())).thenReturn(0L);
        var req = new ReviewExpenseRequest(ApprovalStatus.APPROVED, UUID.randomUUID(), null);

        var ex = assertIllegalArg(() -> service.reviewExpense(eventId, e.getId(), req));

        assertTrue(ex.getMessage().contains("bắt buộc phải có ít nhất 1 chứng từ"));
        assertEquals(ApprovalStatus.PENDING, e.getStatus());
    }

    @Test
    void reviewExpenseRejectsApproveWhenBudgetItemNotApproved() {
        UUID itemId = budgetItem(ApprovalStatus.PENDING);
        Expense e = expense(ApprovalStatus.PENDING, itemId);
        when(receiptRepo.countByExpenseId(e.getId())).thenReturn(1L);
        var req = new ReviewExpenseRequest(ApprovalStatus.APPROVED, UUID.randomUUID(), null);

        var ex = assertIllegalArg(() -> service.reviewExpense(eventId, e.getId(), req));

        assertTrue(ex.getMessage().contains("chưa được duyệt"));
        assertEquals(ApprovalStatus.PENDING, e.getStatus());
        verify(expenseRepo, never()).save(any());
    }

    @Test
    void reviewExpenseApprovesWhenReceiptAndBudgetItemOk() {
        UUID itemId = budgetItem(ApprovalStatus.APPROVED);
        Expense e = expense(ApprovalStatus.PENDING, itemId);
        when(receiptRepo.countByExpenseId(e.getId())).thenReturn(2L);
        UUID approver = UUID.randomUUID();
        var req = new ReviewExpenseRequest(ApprovalStatus.APPROVED, approver, null);

        service.reviewExpense(eventId, e.getId(), req);

        assertEquals(ApprovalStatus.APPROVED, e.getStatus());
        assertEquals(approver, e.getApprovedBy());
        assertNotNull(e.getApprovedAt());
        assertNull(e.getRejectionReason());
    }

    @Test
    void reviewExpenseRejectStoresReasonWithoutNeedingReceipt() {
        Expense e = expense(ApprovalStatus.PENDING, null);
        when(receiptRepo.countByExpenseId(e.getId())).thenReturn(0L);
        var req = new ReviewExpenseRequest(ApprovalStatus.REJECTED, UUID.randomUUID(), "Thiếu hóa đơn");

        service.reviewExpense(eventId, e.getId(), req);

        assertEquals(ApprovalStatus.REJECTED, e.getStatus());
        assertEquals("Thiếu hóa đơn", e.getRejectionReason());
    }

    // ----------------------------------------------------------------- delete

    @Test
    void deleteExpenseRejectsApprovedExpense() {
        Expense e = expense(ApprovalStatus.APPROVED, null);

        assertIllegalArg(() -> service.deleteExpense(eventId, e.getId()));
        verify(receiptRepo, never()).deleteByExpenseId(any());
        verify(expenseRepo, never()).delete(any());
    }

    @Test
    void deleteExpenseRemovesReceiptsAndExpenseWhenPending() {
        Expense e = expense(ApprovalStatus.PENDING, null);

        service.deleteExpense(eventId, e.getId());

        verify(receiptRepo).deleteByExpenseId(e.getId());
        verify(expenseRepo).delete(e);
    }

    // ---------------------------------------------------------------- receipt

    @Test
    void addReceiptStillWorksOnApprovedExpense() {
        Expense e = expense(ApprovalStatus.APPROVED, null);
        CreateReceiptRequest req = receiptReq();
        ExpenseReceipt entity = receipt(e.getId());
        when(mapper.toEntity(e.getId(), req)).thenReturn(entity);
        when(receiptRepo.save(entity)).thenReturn(entity);

        service.addReceipt(eventId, e.getId(), req);

        verify(receiptRepo).save(entity);
    }

    @Test
    void addReceiptThrowsWhenExpenseNotInEvent() {
        UUID id = UUID.randomUUID();
        when(expenseRepo.findByIdAndEventId(id, eventId)).thenReturn(Optional.empty());

        assertIllegalArg(() -> service.addReceipt(eventId, id, receiptReq()));
        verify(receiptRepo, never()).save(any());
    }

    @Test
    void deleteReceiptRejectsApprovedExpense() {
        Expense e = expense(ApprovalStatus.APPROVED, null);
        ExpenseReceipt r = receipt(e.getId());
        when(receiptRepo.findById(r.getId())).thenReturn(Optional.of(r));

        assertIllegalArg(() -> service.deleteReceipt(eventId, e.getId(), r.getId()));
        verify(receiptRepo, never()).deleteById(any());
    }

    @Test
    void deleteReceiptRejectsReceiptOfAnotherExpense() {
        Expense e = expense(ApprovalStatus.PENDING, null);
        ExpenseReceipt other = receipt(UUID.randomUUID());
        when(receiptRepo.findById(other.getId())).thenReturn(Optional.of(other));

        var ex = assertIllegalArg(() -> service.deleteReceipt(eventId, e.getId(), other.getId()));

        assertTrue(ex.getMessage().contains("không thuộc về khoản chi"));
        verify(receiptRepo, never()).deleteById(any());
    }

    @Test
    void deleteReceiptSucceedsForPendingExpense() {
        Expense e = expense(ApprovalStatus.PENDING, null);
        ExpenseReceipt r = receipt(e.getId());
        when(receiptRepo.findById(r.getId())).thenReturn(Optional.of(r));

        service.deleteReceipt(eventId, e.getId(), r.getId());

        verify(receiptRepo).deleteById(r.getId());
    }
}