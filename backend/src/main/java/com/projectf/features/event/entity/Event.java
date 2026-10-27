package com.projectf.features.event.entity;

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
@Table(name = "events")
@Getter
@Setter
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private EventSeries series;
    @Column(name = "season_name")
    private String seasonName;
    @Column(name = "title")
    private String title;
    @Column(name = "description")
    private String description;
    @Column(name = "expected_start_date")
    private LocalDate expectedStartDate;
    @Column(name = "expected_end_date")
    private LocalDate expectedEndDate;
    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;
    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", columnDefinition = "event_status_enum")
    private EventStatus status;
    @Column(name = "allocated_fund")
    private BigDecimal allocatedFund;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
}

