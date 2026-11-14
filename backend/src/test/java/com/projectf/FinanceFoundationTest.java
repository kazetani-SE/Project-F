package com.projectf;

import com.projectf.features.finance.dto.request.CreateBenchmarkRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.entity.BudgetCategory;
import com.projectf.features.finance.entity.ItemPriceBenchmark;
import com.projectf.features.finance.mapper.FinanceMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
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
        var invalidReq = new CreateBenchmarkRequest(null, "  ", "", new BigDecimal("-100"), null, "invalid-url");
        var violations = validator.validate(invalidReq);

        var violatedFields = violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .toList();

        assertTrue(violatedFields.contains("categoryId"));
        assertTrue(violatedFields.contains("itemName"));
        assertTrue(violatedFields.contains("unit"));
        assertTrue(violatedFields.contains("curMarketPrice"));
        assertTrue(violatedFields.contains("supplierLink"));
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
        benchmark.setSupplierName("Đại lý nước FPT");
        benchmark.setSupplierLink("https://example.com/aquafina");

        var bmResp = financeMapper.toResponse(benchmark);
        assertEquals(bmId, bmResp.id());
        assertEquals("Nước suối Aquafina 500ml", bmResp.itemName());
        assertEquals(new BigDecimal("95000"), bmResp.curMarketPrice());
        assertEquals("Đại lý nước FPT", bmResp.supplierName());
        assertEquals("https://example.com/aquafina", bmResp.supplierLink());
    }
}