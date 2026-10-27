package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.BudgetSummaryView;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetSummaryRepository extends JpaRepository<BudgetSummaryView, UUID> {
}
