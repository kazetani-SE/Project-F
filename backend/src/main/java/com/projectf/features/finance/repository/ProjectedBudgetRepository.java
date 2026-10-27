package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ProjectedBudgetView;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectedBudgetRepository extends JpaRepository<ProjectedBudgetView, UUID> {
    List<ProjectedBudgetView> findByPreviousEventIdOrderByItemName(UUID previousEventId);
}
