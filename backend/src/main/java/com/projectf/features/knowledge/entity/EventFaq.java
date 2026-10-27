package com.projectf.features.knowledge.entity;

import com.projectf.features.event.entity.EventSeries;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "event_faqs")
@Getter
@Setter
public class EventFaq {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private EventSeries series;
    @Column(name = "question")
    private String question;
    @Column(name = "answer")
    private String answer;
    @Column(name = "category")
    private String category;
    @Column(name = "is_pinned")
    private Boolean isPinned;
    @Column(name = "updated_at")
    private Instant updatedAt;
}

