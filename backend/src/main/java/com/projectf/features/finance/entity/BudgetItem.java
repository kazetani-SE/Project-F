package com.projectf.features.finance.entity;

import com.projectf.common.enums.ApprovalStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@DynamicInsert
@Table(name = "budget_items")
public class BudgetItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "benchmark_id")
    private UUID benchmarkId;

    @Column(name = "item_name", nullable = false, length = 200)
    private String itemName;

    @Column(name = "media_asset")
    private UUID mediaAsset;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(name = "estimated_unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal estimatedUnitPrice;

    /** Cột GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED trong PostgreSQL */
    @Column(name = "total_estimated_amount", insertable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal totalEstimatedAmount;

    @Column(columnDefinition = "text")
    private String notes;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "approval_status", columnDefinition = "approval_status_enum", nullable = false)
    private ApprovalStatus approvalStatus;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, insertable = false)
    private OffsetDateTime createdAt;
}

