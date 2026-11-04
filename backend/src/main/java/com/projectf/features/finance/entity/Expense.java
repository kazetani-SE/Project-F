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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@DynamicInsert
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "budget_item_id")
    private UUID budgetItemId;

    @Column(name = "item_name", nullable = false, length = 200)
    private String itemName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(name = "actual_unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal actualUnitPrice;

    /** Cột GENERATED ALWAYS AS (quantity * actual_unit_price) STORED trong PostgreSQL */
    @Column(name = "total_amount", insertable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_by", nullable = false)
    private UUID paidBy;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "approval_status_enum", nullable = false)
    private ApprovalStatus status;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "created_at", nullable = false, insertable = false)
    private OffsetDateTime createdAt;
}

