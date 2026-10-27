package com.projectf.features.finance.entity;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.event.entity.Event;
import com.projectf.features.member.entity.ClubMember;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "expenses")
@Getter
@Setter
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_item_id")
    private BudgetItem budgetItem;
    @Column(name = "item_name")
    private String itemName;
    @Column(name = "quantity")
    private BigDecimal quantity;
    @Column(name = "actual_unit_price")
    private BigDecimal actualUnitPrice;
    @Column(name = "total_amount", insertable = false, updatable = false)
    private BigDecimal totalAmount;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by")
    private ClubMember paidBy;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", columnDefinition = "approval_status_enum")
    private ApprovalStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private ClubMember approvedBy;
    @Column(name = "approved_at")
    private Instant approvedAt;
    @Column(name = "rejection_reason")
    private String rejectionReason;
    @Column(name = "payment_date")
    private LocalDate paymentDate;
    @Column(name = "notes")
    private String notes;
    @Column(name = "created_at")
    private Instant createdAt;
}

