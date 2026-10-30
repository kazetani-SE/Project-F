package com.projectf.features.event.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
// 'id' ánh xạ khóa chính UUID theo migration V1.
@Getter @Setter @NoArgsConstructor @Entity @DynamicInsert @Table(name="events")
public class Event {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 /** Giữ UUID ở bộ khung này để feature event chưa phụ thuộc vòng đời entity khác. */
 @Column(name="series_id") private UUID seriesId;
 @Column(name="season_name",nullable=false,length=50) private String seasonName;
 @Column(nullable=false,length=255) private String title;
 @Column(columnDefinition="text") private String description;
 @Column(name="expected_start_date",nullable=false) private LocalDate expectedStartDate;
 @Column(name="expected_end_date",nullable=false) private LocalDate expectedEndDate;
 @Column(name="actual_start_date") private LocalDate actualStartDate;
 @Column(name="actual_end_date") private LocalDate actualEndDate;
 /** Nếu request không cấp status/quỹ, DynamicInsert để PostgreSQL dùng DEFAULT trong V1. */
 @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(columnDefinition="event_status_enum",nullable=false) private EventStatus status;
 @Column(name="allocated_fund",nullable=false,precision=15,scale=2) private BigDecimal allocatedFund;
 @Column(name="created_at",nullable=false,insertable=false) private OffsetDateTime createdAt;
 /** V1 không có trigger cập nhật; Hibernate ghi mốc thời gian mỗi lần sửa entity. */
 @UpdateTimestamp @Column(name="updated_at",nullable=false) private OffsetDateTime updatedAt;
}
