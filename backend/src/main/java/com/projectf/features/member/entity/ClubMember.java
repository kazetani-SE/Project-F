package com.projectf.features.member.entity;

import com.projectf.common.enums.Department;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.DynamicInsert
@Table(name = "club_members")
@Getter
@Setter
public class ClubMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "student_id")
    private String studentId;
    @Column(name = "full_name")
    private String fullName;
    @Column(name = "email")
    private String email;
    @Column(name = "phone")
    private String phone;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "department", columnDefinition = "department_enum")
    private Department department;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "club_role", columnDefinition = "club_role_enum")
    private ClubRole clubRole;
    @Column(name = "batch")
    private String batch;
    @Column(name = "is_active")
    private Boolean isActive;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "inactive_at")
    private Instant inactiveAt;
    @Column(name = "auth_user_id")
    private UUID authUserId;
}

