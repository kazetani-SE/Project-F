package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ProjectedBudgetView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectedBudgetViewRepository extends JpaRepository<ProjectedBudgetView, UUID> {
    List<ProjectedBudgetView> findByPreviousEventId(UUID previousEventId);
}

