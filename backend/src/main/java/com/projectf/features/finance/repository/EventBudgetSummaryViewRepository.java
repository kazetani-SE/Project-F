package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.EventBudgetSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EventBudgetSummaryViewRepository extends JpaRepository<EventBudgetSummaryView, UUID> {
}

