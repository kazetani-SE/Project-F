package com.projectf.features.finance.entity;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "budget_categories")
@Getter
@Setter
public class BudgetCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "name")
    private String name;
    @Column(name = "description")
    private String description;
}

