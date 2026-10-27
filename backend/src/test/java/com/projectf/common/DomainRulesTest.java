package com.projectf.common;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class DomainRulesTest {

    @Test
    void rejectsEndDateBeforeStartDate() {
        assertThrows(IllegalArgumentException.class,
                () -> DomainRules.eventDates(LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 19)));
    }

    @Test
    void approvedExpenseRequiresReceiptAndAvailableFund() {
        assertThrows(IllegalArgumentException.class,
                () -> DomainRules.approveExpense(0, new BigDecimal("100"), new BigDecimal("20"), new BigDecimal("10")));
        assertThrows(IllegalArgumentException.class,
                () -> DomainRules.approveExpense(1, new BigDecimal("100"), new BigDecimal("95"), new BigDecimal("10")));
        assertDoesNotThrow(() -> DomainRules.approveExpense(1, new BigDecimal("100"), new BigDecimal("90"), new BigDecimal("10")));
    }

    @Test
    void enforcesUploadLimit() {
        assertThrows(IllegalArgumentException.class,
                () -> DomainRules.upload("RECEIPT", "image/jpeg", 15L * 1024 * 1024 + 1));
        assertDoesNotThrow(() -> DomainRules.upload("RECEIPT", "image/png", 15L * 1024 * 1024));
        assertThrows(IllegalArgumentException.class,
                () -> DomainRules.upload("RECEIPT", "application/zip", 1024));
    }
}
