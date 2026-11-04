package com.projectf.features.knowledge.entity;

import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
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
@Table(name = "event_incidents")
public class EventIncident {

    private static final String TEXT = "TEXT";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "reported_by")
    private UUID reportedBy;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "incident_severity_enum", nullable = false)
    private IncidentSeverity severity;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "department_involved", columnDefinition = "department_enum[]", nullable = false)
    private List<Department> departments;

    @Column(name = "incident_description", nullable = false, columnDefinition = TEXT)
    private String description;

    @Column(name = "root_cause", nullable = false, columnDefinition = TEXT)
    private String rootCause;

    @Column(name = "immediate_solution", nullable = false, columnDefinition = TEXT)
    private String immediateSolution;

    @Column(name = "lesson_learned", nullable = false, columnDefinition = TEXT)
    private String lessonLearned;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
