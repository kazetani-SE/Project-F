package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.CreateBenchmarkRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.dto.request.CreateExpenseRequest;
import com.projectf.features.finance.dto.request.ReviewExpenseRequest;
import com.projectf.features.finance.entity.BudgetCategory;
import com.projectf.features.finance.entity.Expense;
import com.projectf.features.finance.entity.ItemPriceBenchmark;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.ExpenseReceiptRepository;
import com.projectf.features.finance.repository.ExpenseRepository;
import com.projectf.features.finance.service.impl.ExpenseServiceImpl;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class FinanceFoundationTest {

    private Validator validator;
    private FinanceMapper financeMapper;

    @BeforeEach
    void setUp() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            this.validator = factory.getValidator();
        }
        this.financeMapper = new FinanceMapper();
    }

    @Test
    void benchmarkRequestRejectsNegativePriceAndBlankNames() {
        var invalidReq = new CreateBenchmarkRequest(null, "  ", "", new BigDecimal("-100"), null);
        var violations = validator.validate(invalidReq);

        var violatedFields = violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .toList();

        assertTrue(violatedFields.contains("categoryId"));
        assertTrue(violatedFields.contains("itemName"));
        assertTrue(violatedFields.contains("unit"));
        assertTrue(violatedFields.contains("curMarketPrice"));
    }

    @Test
    void budgetItemRequestRejectsZeroOrNegativeQuantity() {
        var zeroQty = new CreateBudgetItemRequest(
                UUID.randomUUID(), UUID.randomUUID(), null, null,
                "Standee A0", BigDecimal.ZERO, "Cái", new BigDecimal("150000"), null);
        var violations = validator.validate(zeroQty);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("quantity")));

        var negativePrice = new CreateBudgetItemRequest(
                UUID.randomUUID(), UUID.randomUUID(), null, null,
                "Standee A0", new BigDecimal("2"), "Cái", new BigDecimal("-50000"), null);
        var priceViolations = validator.validate(negativePrice);
        assertFalse(priceViolations.isEmpty());
        assertTrue(priceViolations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("estUnitPrice")));
    }

    @Test
    void expenseRequestValidationSuccess() {
        var validReq = new CreateExpenseRequest(
                UUID.randomUUID(), UUID.randomUUID(), "In ấn backdrop sân khấu",
                new BigDecimal("1"), new BigDecimal("450000"), UUID.randomUUID(),
                LocalDate.of(2026, 11, 4), "Đã thanh toán cho nhà in F", null);
        var violations = validator.validate(validReq);
        assertTrue(violations.isEmpty());
    }

    @Test
    void mapperCorrectlyConvertsBenchmarkAndCategory() {
        var cat = new BudgetCategory();
        UUID catId = UUID.randomUUID();
        cat.setId(catId);
        cat.setName("Hậu cần");
        cat.setDescription("Kinh phí mua sắm vật tư hậu cần");

        var catResp = financeMapper.toResponse(cat);
        assertEquals(catId, catResp.id());
        assertEquals("Hậu cần", catResp.name());
        assertEquals("Kinh phí mua sắm vật tư hậu cần", catResp.description());

        var benchmark = new ItemPriceBenchmark();
        UUID bmId = UUID.randomUUID();
        benchmark.setId(bmId);
        benchmark.setCategoryId(catId);
        benchmark.setItemName("Nước suối Aquafina 500ml");
        benchmark.setUnit("Thùng");
        benchmark.setCurMarketPrice(new BigDecimal("95000"));
        benchmark.setSupplierReference("Đại lý nước FPT");

        var bmResp = financeMapper.toResponse(benchmark);
        assertEquals(bmId, bmResp.id());
        assertEquals("Nước suối Aquafina 500ml", bmResp.itemName());
        assertEquals(new BigDecimal("95000"), bmResp.curMarketPrice());
    }

    @Test
    void reviewExpenseThrowsExceptionWhenApprovedWithoutReceipt() {
        UUID expenseId = UUID.randomUUID();
        Expense expense = new Expense();
        expense.setId(expenseId);
        expense.setStatus(ApprovalStatus.PENDING);

        // Tạo dynamic proxy cho ExpenseRepository & ExpenseReceiptRepository
        ExpenseRepository expenseRepo = (ExpenseRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[] { ExpenseRepository.class },
                (proxy, method, args) -> {
                    if (method.getName().equals("findById"))
                        return Optional.of(expense);
                    return null;
                });

        ExpenseReceiptRepository receiptRepo = (ExpenseReceiptRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[] { ExpenseReceiptRepository.class },
                (proxy, method, args) -> {
                    if (method.getName().equals("countByExpenseId"))
                        return 0L;
                    return null;
                });

        var service = new ExpenseServiceImpl(expenseRepo, receiptRepo, financeMapper);
        var approveRequest = new ReviewExpenseRequest(ApprovalStatus.APPROVED, UUID.randomUUID(), null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.reviewExpense(expenseId, approveRequest));

        assertTrue(ex.getMessage().contains("bắt buộc phải có ít nhất 1 chứng từ"));
    }

    @Test
    void reviewExpenseSucceedsWhenReceiptIsPresent() {
        UUID expenseId = UUID.randomUUID();
        Expense expense = new Expense();
        expense.setId(expenseId);
        expense.setStatus(ApprovalStatus.PENDING);

        ExpenseRepository expenseRepo = (ExpenseRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[] { ExpenseRepository.class },
                (proxy, method, args) -> {
                    if (method.getName().equals("findById"))
                        return Optional.of(expense);
                    if (method.getName().equals("save"))
                        return args[0];
                    return null;
                });

        ExpenseReceiptRepository receiptRepo = (ExpenseReceiptRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[] { ExpenseReceiptRepository.class },
                (proxy, method, args) -> {
                    if (method.getName().equals("countByExpenseId"))
                        return 2L;
                    if (method.getName().equals("findByExpenseId"))
                        return Collections.emptyList();
                    return null;
                });

        var service = new ExpenseServiceImpl(expenseRepo, receiptRepo, financeMapper);
        var approveRequest = new ReviewExpenseRequest(ApprovalStatus.APPROVED, UUID.randomUUID(), null);

        var response = service.reviewExpense(expenseId, approveRequest);
        assertNotNull(response);
        assertEquals(ApprovalStatus.APPROVED, response.status());
    }
}