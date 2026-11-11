package com.projectf.features.finance.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@DynamicInsert
@Table(name = "item_price_benchmarks", uniqueConstraints = {
        @UniqueConstraint(name = "uq_benchmark_item_unit", columnNames = { "item_name", "unit" })
})
public class ItemPriceBenchmark {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "item_name", nullable = false, length = 200)
    private String itemName;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(name = "current_market_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal curMarketPrice;

    @Column(name = "supplier_name", length = 200)
    private String supplierName;

    @Column(name = "supplier_link", columnDefinition = "TEXT")
    private String supplierLink;

    @UpdateTimestamp
    @Column(name = "last_updated_at", nullable = false)
    private OffsetDateTime lastUpdatedAt;
}