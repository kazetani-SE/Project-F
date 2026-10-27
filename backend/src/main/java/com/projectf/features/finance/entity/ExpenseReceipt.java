package com.projectf.features.finance.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "expense_receipts")
@Getter
@Setter
public class ExpenseReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id")
    private Expense expense;
    @Column(name = "receipt_code")
    private String receiptCode;
    @Column(name = "image_url")
    private String imageUrl;
    @Column(name = "supplier_name")
    private String supplierName;
    @Column(name = "created_at")
    private Instant createdAt;
}

