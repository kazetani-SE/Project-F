package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.BudgetCategory;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetCategoryRepository extends JpaRepository<BudgetCategory, UUID> {
}

