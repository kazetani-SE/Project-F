package com.projectf.features.event.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.type.SqlTypes;
@Getter @Setter @NoArgsConstructor @Entity @DynamicInsert @Table(name="event_organizers",uniqueConstraints=@UniqueConstraint(name="uq_event_member",columnNames={"event_id","member_id"}))
public class EventOrganizer {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 /** FK dùng UUID trong Phase 0; service sau này sẽ kiểm tra event/member tồn tại. */
 @Column(name="event_id",nullable=false) private UUID eventId;
 @Column(name="member_id",nullable=false) private UUID memberId;
 @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(columnDefinition="event_role_enum",nullable=false) private EventRole role;
 @Column(name="assigned_tasks",columnDefinition="text") private String assignedTasks;
 @Column(name="joined_at",nullable=false,insertable=false) private OffsetDateTime joinedAt;
}
