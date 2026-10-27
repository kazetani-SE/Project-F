package com.projectf.features.knowledge.entity;

import com.projectf.common.enums.Department;
import com.projectf.features.event.entity.Event;
import com.projectf.features.member.entity.ClubMember;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "event_incidents")
@Getter
@Setter
public class EventIncident {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private ClubMember reportedBy;
    @Column(name = "title")
    private String title;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", columnDefinition = "incident_severity_enum")
    private IncidentSeverity severity;
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Enumerated(EnumType.STRING)
    @Column(name = "department_involved", columnDefinition = "department_enum[]")
    private Department[] departmentInvolved;
    @Column(name = "incident_description")
    private String incidentDescription;
    @Column(name = "root_cause")
    private String rootCause;
    @Column(name = "immediate_solution")
    private String immediateSolution;
    @Column(name = "lesson_learned")
    private String lessonLearned;
    @Column(name = "created_at")
    private Instant createdAt;
}

