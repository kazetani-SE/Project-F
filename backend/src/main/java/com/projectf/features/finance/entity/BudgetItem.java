package com.projectf.features.finance.entity;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.event.entity.Event;
import com.projectf.features.knowledge.entity.EventMediaAsset;
import com.projectf.features.member.entity.ClubMember;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "budget_items")
@Getter
@Setter
public class BudgetItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private BudgetCategory category;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benchmark_id")
    private ItemPriceBenchmark benchmark;
    @Column(name = "item_name")
    private String itemName;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_asset")
    private EventMediaAsset mediaAsset;
    @Column(name = "quantity")
    private BigDecimal quantity;
    @Column(name = "unit")
    private String unit;
    @Column(name = "estimated_unit_price")
    private BigDecimal estimatedUnitPrice;
    @Column(name = "total_estimated_amount", insertable = false, updatable = false)
    private BigDecimal totalEstimatedAmount;
    @Column(name = "notes")
    private String notes;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "approval_status", columnDefinition = "approval_status_enum")
    private ApprovalStatus approvalStatus;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private ClubMember approvedBy;
    @Column(name = "approved_at")
    private Instant approvedAt;
    @Column(name = "rejection_reason")
    private String rejectionReason;
    @Column(name = "created_at")
    private Instant createdAt;
}

