package com.projectf.features.finance.repository;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.entity.BudgetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BudgetItemRepository extends JpaRepository<BudgetItem, UUID> {
    List<BudgetItem> findByEventId(UUID eventId);
    List<BudgetItem> findByEventIdAndApprovalStatus(UUID eventId, ApprovalStatus status);
    boolean existsByCategoryId(UUID categoryId);
}