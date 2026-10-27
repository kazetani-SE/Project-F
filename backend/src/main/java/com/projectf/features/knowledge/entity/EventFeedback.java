package com.projectf.features.knowledge.entity;

import com.projectf.features.event.entity.Event;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "event_feedbacks")
@Getter
@Setter
public class EventFeedback {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @Column(name = "source_type")
    private String sourceType;
    @Column(name = "file_url")
    private String fileUrl;
    @Column(name = "rating_score")
    private Integer ratingScore;
    @Column(name = "highlight_content")
    private String highlightContent;
    @Column(name = "improvement_content")
    private String improvementContent;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_responses", columnDefinition = "jsonb")
    private Map<String,Object> customResponses;
    @Column(name = "submitted_at")
    private Instant submittedAt;
}

