package com.projectf.features.event.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
@Getter @Setter @NoArgsConstructor @Entity @Table(name="event_series")
public class EventSeries {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @Column(nullable=false,length=200) private String name;
 @Column(columnDefinition="text") private String description;
 @Column(name="created_at",nullable=false,insertable=false) private OffsetDateTime createdAt;
}
