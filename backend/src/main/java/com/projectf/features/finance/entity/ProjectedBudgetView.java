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
@Table(name = "v_projected_budget_from_previous_season")
public class ProjectedBudgetView {
    @Column(name = "previous_event_id")
    private UUID previousEventId;
    @Id
    @Column(name = "previous_budget_item_id")
    private UUID previousBudgetItemId;
    @Column(name = "category_id")
    private UUID categoryId;
    @Column(name = "benchmark_id")
    private UUID benchmarkId;
    @Column(name = "item_name")
    private String itemName;
    private String unit;
    @Column(name = "previous_planned_qty")
    private BigDecimal previousPlannedQty;
    @Column(name = "base_quantity_for_projection")
    private BigDecimal baseQuantityForProjection;
    @Column(name = "previous_unit_price")
    private BigDecimal previousUnitPrice;
    @Column(name = "current_adjusted_unit_price")
    private BigDecimal currentAdjustedUnitPrice;
    @Column(name = "projected_current_cost")
    private BigDecimal projectedCurrentCost;

    protected ProjectedBudgetView() {
    }

    public UUID getPreviousEventId() { return previousEventId; }
    public UUID getPreviousBudgetItemId() { return previousBudgetItemId; }
    public UUID getCategoryId() { return categoryId; }
    public UUID getBenchmarkId() { return benchmarkId; }
    public String getItemName() { return itemName; }
    public String getUnit() { return unit; }
    public BigDecimal getPreviousPlannedQty() { return previousPlannedQty; }
    public BigDecimal getBaseQuantityForProjection() { return baseQuantityForProjection; }
    public BigDecimal getPreviousUnitPrice() { return previousUnitPrice; }
    public BigDecimal getCurrentAdjustedUnitPrice() { return currentAdjustedUnitPrice; }
    public BigDecimal getProjectedCurrentCost() { return projectedCurrentCost; }
}
