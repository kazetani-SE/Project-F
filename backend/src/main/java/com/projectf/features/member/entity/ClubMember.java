package com.projectf.features.member.entity;
import com.projectf.common.enums.ClubRole;
import com.projectf.common.enums.Department;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
// 'id' ánh xạ khóa chính UUID theo migration V1.
@Getter @Setter @NoArgsConstructor @Entity @Table(name = "club_members")
public class ClubMember {
 @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
 @Column(name="student_id",nullable=false,length=8,unique=true) private String studentId;
 @Column(name="full_name",nullable=false,length=100) private String fullName;
 @Column(nullable=false,length=100,unique=true) private String email;
 @Column(length=15) private String phone;
 @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(columnDefinition="department_enum") private Department department;
 @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(name="club_role",columnDefinition="club_role_enum") private ClubRole clubRole;
 @Column(nullable=false,length=4) private String batch;
 /** PostgreSQL cấp giá trị mặc định; chưa tự gán trong Java để không lệch migration V1. */
 @Column(name="is_active",nullable=false,insertable=false) private Boolean active;
 @Column(name="created_at",nullable=false,insertable=false) private OffsetDateTime createdAt;
 @Column(name="inactive_at") private OffsetDateTime inactiveAt;
}
