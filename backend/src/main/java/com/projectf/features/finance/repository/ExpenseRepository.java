package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.Expense;
import java.util.UUID;
import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    Page<Expense> findByEventId(UUID eventId, Pageable pageable);
    java.util.Optional<Expense> findByIdAndEventId(UUID id, UUID eventId);
    @Query("select coalesce(sum(e.totalAmount), 0) from Expense e "
            + "where e.event.id = :eventId and e.status = com.projectf.common.enums.ApprovalStatus.APPROVED "
            + "and e.id <> :excludedId")
    BigDecimal sumApprovedExcept(@Param("eventId") UUID eventId, @Param("excludedId") UUID excludedId);
}

