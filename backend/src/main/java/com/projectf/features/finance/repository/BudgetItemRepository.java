package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.BudgetItem;
import java.util.UUID;
import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BudgetItemRepository extends JpaRepository<BudgetItem, UUID> {
    Page<BudgetItem> findByEventId(UUID eventId, Pageable pageable);
    java.util.Optional<BudgetItem> findByIdAndEventId(UUID id, UUID eventId);
    long countByEventId(UUID eventId);
    @Query("select coalesce(sum(b.totalEstimatedAmount), 0) from BudgetItem b "
            + "where b.event.id = :eventId and b.approvalStatus = com.projectf.common.enums.ApprovalStatus.APPROVED "
            + "and b.id <> :excludedId")
    BigDecimal sumApprovedExcept(@Param("eventId") UUID eventId, @Param("excludedId") UUID excludedId);
}

