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
@Table(name = "event_documents")
@Getter
@Setter
public class EventDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_document_id")
    private EventDocument parentDocument;
    @Column(name = "doc_type")
    private String docType;
    @Column(name = "title")
    private String title;
    @Column(name = "version")
    private String version;
    @Column(name = "file_url")
    private String fileUrl;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private ClubMember uploadedBy;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", columnDefinition = "approval_status_enum")
    private ApprovalStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private ClubMember approvedBy;
    @Column(name = "approved_at")
    private Instant approvedAt;
    @Column(name = "rejection_reason")
    private String rejectionReason;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
}

