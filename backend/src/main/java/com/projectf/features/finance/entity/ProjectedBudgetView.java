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
@Table(name = "v_projected_budget_from_previous_season")
public class ProjectedBudgetView {

    @Id
    @Column(name = "previous_budget_item_id")
    private UUID prevBudgetItemId;

    @Column(name = "previous_event_id")
    private UUID previousEventId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "benchmark_id")
    private UUID benchmarkId;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "unit")
    private String unit;

    @Column(name = "previous_planned_qty")
    private BigDecimal prevPlannedQty;

    @Column(name = "base_quantity_for_projection")
    private BigDecimal baseProjectionQty;

    @Column(name = "previous_unit_price")
    private BigDecimal previousUnitPrice;

    @Column(name = "current_adjusted_unit_price")
    private BigDecimal adjustedUnitPrice;

    @Column(name = "projected_current_cost")
    private BigDecimal projectedCost;
}