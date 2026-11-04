package com.projectf.features.finance.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicInsert;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@DynamicInsert
@Table(name = "budget_categories")
public class BudgetCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100, unique = true)
    private String name;

    @Column(columnDefinition = "text")
    private String description;
}

