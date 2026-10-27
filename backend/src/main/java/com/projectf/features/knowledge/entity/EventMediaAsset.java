package com.projectf.features.knowledge.entity;

import com.projectf.common.enums.ApprovalStatus;
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
@Table(name = "event_media_assets")
@Getter
@Setter
public class EventMediaAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @Column(name = "asset_type")
    private String assetType;
    @Column(name = "title")
    private String title;
    @Column(name = "specifications")
    private String specifications;
    @Column(name = "design_file_url")
    private String designFileUrl;
    @Column(name = "preview_image_url")
    private String previewImageUrl;
    @Column(name = "is_printed")
    private Boolean isPrinted;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "approval_status", columnDefinition = "approval_status_enum")
    private ApprovalStatus approvalStatus;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private ClubMember approvedBy;
    @Column(name = "created_at")
    private Instant createdAt;
}

