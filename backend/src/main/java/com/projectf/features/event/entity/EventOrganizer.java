package com.projectf.features.event.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Generated;
import org.hibernate.type.SqlTypes;
// 'id' ánh xạ khóa chính UUID theo migration V1.
@Getter @Setter @NoArgsConstructor @Entity @Table(name="event_organizers",uniqueConstraints=@UniqueConstraint(name="uq_event_member",columnNames={"event_id","member_id"}))
public class EventOrganizer {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @Column(name="event_id",nullable=false) private UUID eventId;
 @Column(name="member_id",nullable=false) private UUID memberId;
 @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(columnDefinition="event_role_enum",nullable=false) private EventRole role = EventRole.MEMBER;
 @Column(name="assigned_tasks",columnDefinition="text") private String assignedTasks;
 @Generated @Column(name="joined_at",nullable=false,insertable=false,updatable=false) private OffsetDateTime joinedAt;
}
