package com.projectf.features.event.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "event_series")
@Getter
@Setter
public class EventSeries {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "name")
    private String name;
    @Column(name = "description")
    private String description;
    @Column(name = "created_at")
    private Instant createdAt;
}

