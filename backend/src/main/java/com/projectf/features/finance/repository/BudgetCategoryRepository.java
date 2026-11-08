package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.BudgetCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BudgetCategoryRepository extends JpaRepository<BudgetCategory, UUID> {
    List<BudgetCategory> findByDeletedAtIsNull();
    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);
    boolean existsByNameIgnoreCaseAndIdNotAndDeletedAtIsNull(String name, UUID id);
}