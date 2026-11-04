package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ExpenseReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseReceiptRepository extends JpaRepository<ExpenseReceipt, UUID> {
    List<ExpenseReceipt> findByExpenseId(UUID expenseId);
    long countByExpenseId(UUID expenseId);
    void deleteByExpenseId(UUID expenseId);
}

