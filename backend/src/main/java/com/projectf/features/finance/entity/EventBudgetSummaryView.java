package com.projectf.features.finance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Immutable
@Table(name = "v_event_budget_summary")
public class EventBudgetSummaryView {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "event_title")
    private String eventTitle;

    @Column(name = "season_name")
    private String seasonName;

    @Column(name = "allocated_fund")
    private BigDecimal allocatedFund;

    @Column(name = "total_budget_estimated")
    private BigDecimal totalBudgetEstimated;

    @Column(name = "total_actual_spent")
    private BigDecimal totalActualSpent;

    @Column(name = "remaining_allocated_fund")
    private BigDecimal remainingAllocatedFund;

    @Column(name = "variance_against_estimate")
    private BigDecimal varianceAgainstEstimate;
}

