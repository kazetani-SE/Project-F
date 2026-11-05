package com.projectf.features.knowledge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "event_feedbacks")
public class EventFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "source_type", nullable = false, length = 50)
    private String sourceType = "ATTENDEE";

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "rating_score", nullable = false)
    private Integer ratingScore;

    @Column(name = "highlight_content", columnDefinition = "TEXT")
    private String highlightContent;

    @Column(name = "improvement_content", columnDefinition = "TEXT")
    private String improveContent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_responses", columnDefinition = "jsonb")
    private Map<String, Object> customResponses;

    @Column(name = "submitted_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime submittedAt;
}
