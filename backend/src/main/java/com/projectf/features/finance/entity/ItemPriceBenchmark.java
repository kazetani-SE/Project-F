package com.projectf.features.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "item_price_benchmarks")
@Getter
@Setter
public class ItemPriceBenchmark {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private BudgetCategory category;
    @Column(name = "item_name")
    private String itemName;
    @Column(name = "unit")
    private String unit;
    @Column(name = "current_market_price")
    private BigDecimal currentMarketPrice;
    @Column(name = "supplier_reference")
    private String supplierReference;
    @Column(name = "last_updated_at")
    private Instant lastUpdatedAt;
}

