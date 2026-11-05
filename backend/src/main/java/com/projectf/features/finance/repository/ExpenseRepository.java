package com.projectf.features.finance.repository;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    List<Expense> findByEventId(UUID eventId);
    List<Expense> findByEventIdAndStatus(UUID eventId, ApprovalStatus status);
    List<Expense> findByBudgetItemId(UUID budgetItemId);
}

