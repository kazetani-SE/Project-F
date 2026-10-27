package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ExpenseReceipt;
import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseReceiptRepository extends JpaRepository<ExpenseReceipt, UUID> {
    List<ExpenseReceipt> findByExpenseIdOrderByCreatedAtDesc(UUID expenseId);
    long countByExpenseId(UUID expenseId);
}

