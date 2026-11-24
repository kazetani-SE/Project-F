package com.projectf.features.knowledge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
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
@Table(name = "event_feedback_ai_reports")
public class EventFeedbackAiReport {

    private static final String JSONB_TYPE = "jsonb";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "model_used", nullable = false, length = 100)
    private String modelUsed;

    @Column(name = "model_tier", nullable = false, length = 20)
    private String modelTier;

    @Column(name = "feedback_count_snapshot", nullable = false)
    private Integer fbCountSnap;

    @Column(name = "latest_feedback_at_snapshot")
    private OffsetDateTime latestFbAtSnap;

    @Column(name = "average_rating_snapshot", nullable = false, precision = 4, scale = 2)
    private BigDecimal avgRatingSnap = BigDecimal.ZERO;

    @Column(name = "executive_summary", nullable = false, columnDefinition = "TEXT")
    private String executiveSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sentiment_breakdown", nullable = false, columnDefinition = JSONB_TYPE)
    private Map<String, Integer> sentimentMap;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top_highlights", nullable = false, columnDefinition = JSONB_TYPE)
    private List<String> topHighlights;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top_improvements", nullable = false, columnDefinition = JSONB_TYPE)
    private List<String> topImprovements;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "department_actions", nullable = false, columnDefinition = JSONB_TYPE)
    private List<Map<String, String>> departmentActions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "suggested_incidents", nullable = false, columnDefinition = JSONB_TYPE)
    private List<Map<String, Object>> incidentDrafts;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.generatedAt == null) {
            this.generatedAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
