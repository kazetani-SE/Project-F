package com.projectf.features.finance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "v_event_budget_summary")
public class BudgetSummaryView {
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

    protected BudgetSummaryView() {
    }

    public UUID getEventId() { return eventId; }
    public String getEventTitle() { return eventTitle; }
    public String getSeasonName() { return seasonName; }
    public BigDecimal getAllocatedFund() { return allocatedFund; }
    public BigDecimal getTotalBudgetEstimated() { return totalBudgetEstimated; }
    public BigDecimal getTotalActualSpent() { return totalActualSpent; }
    public BigDecimal getRemainingAllocatedFund() { return remainingAllocatedFund; }
    public BigDecimal getVarianceAgainstEstimate() { return varianceAgainstEstimate; }
}
