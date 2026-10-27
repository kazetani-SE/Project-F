package com.projectf;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import org.junit.jupiter.api.Test;

class EntityMappingTest {
    @Test
    void generatedTotalsAreReadOnlyAndRelationshipsAreLazy() throws Exception {
        Class<?> budget = Class.forName("com.projectf.features.finance.entity.BudgetItem");
        Column total = budget.getDeclaredField("totalEstimatedAmount").getAnnotation(Column.class);
        assertFalse(total.insertable());
        assertFalse(total.updatable());
        assertEquals(FetchType.LAZY, budget.getDeclaredField("event").getAnnotation(ManyToOne.class).fetch());
        Class<?> expense = Class.forName("com.projectf.features.finance.entity.Expense");
        Column actual = expense.getDeclaredField("totalAmount").getAnnotation(Column.class);
        assertFalse(actual.insertable());
        assertFalse(actual.updatable());
    }
}
