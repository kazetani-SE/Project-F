package com.projectf.features.event.entity;

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
@Table(name = "event_organizers")
@Getter
@Setter
public class EventOrganizer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private ClubMember member;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "role", columnDefinition = "event_role_enum")
    private EventRole role;
    @Column(name = "assigned_tasks")
    private String assignedTasks;
    @Column(name = "joined_at")
    private Instant joinedAt;
}

