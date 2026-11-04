package com.projectf.features.document.service.impl;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.document.dto.request.CreateDocumentRequest;
import com.projectf.features.document.dto.request.DocumentApprovalRequest;
import com.projectf.features.document.dto.response.DocumentResponse;
import com.projectf.features.document.entity.EventDocument;
import com.projectf.features.document.mapper.DocumentMapper;
import com.projectf.features.document.repository.DocumentRepository;
import com.projectf.features.document.service.DocumentService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentServiceImpl implements DocumentService {

    private static final Set<String> VALID_TYPES = Set.of(
            "MASTER_PLAN",
            "RUNNING_ORDER",
            "SPONSOR_PROPOSAL",
            "MEETING_MINUTES",
            "RISK_PLAN",
            "OTHER"
    );

    private final DocumentRepository docRepo;
    private final DocumentMapper docMapper;

    public DocumentServiceImpl(DocumentRepository docRepo, DocumentMapper docMapper) {
        this.docRepo = docRepo;
        this.docMapper = docMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsByEvent(UUID eventId) {
        return docRepo.findByEventIdOrderByCreatedAtDesc(eventId).stream()
                .map(docMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(UUID documentId) {
        EventDocument doc = docRepo.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài liệu với ID: " + documentId));
        return docMapper.toResponse(doc);
    }

    @Override
    @Transactional
    public DocumentResponse createDocument(UUID eventId, CreateDocumentRequest request) {
        if (!VALID_TYPES.contains(request.docType())) {
            throw new IllegalArgumentException("Loại tài liệu không hợp lệ: " + request.docType());
        }

        String resolvedVersion = request.version();
        if (request.parentDocumentId() != null) {
            EventDocument parentDoc = docRepo.findById(request.parentDocumentId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Tài liệu phiên bản gốc không tồn tại: " + request.parentDocumentId()
                    ));
            if (parentDoc.getEventId() != null && !parentDoc.getEventId().equals(eventId)) {
                throw new IllegalArgumentException("Tài liệu gốc không thuộc cùng sự kiện hiện tại");
            }
            if (resolvedVersion == null || resolvedVersion.isBlank()) {
                resolvedVersion = incrementVersion(parentDoc.getVersion());
            }
        }

        EventDocument entity = docMapper.toEntity(eventId, request);
        if (resolvedVersion != null && !resolvedVersion.isBlank()) {
            entity.setVersion(resolvedVersion);
        }
        EventDocument saved = docRepo.save(entity);
        return docMapper.toResponse(saved);
    }

    public static String incrementVersion(String currentVersion) {
        String nextVersion = "1.1";
        if (currentVersion != null && !currentVersion.isBlank()) {
            String normalized = currentVersion.trim().replaceFirst("^[vV]", "");
            int dotIdx = normalized.lastIndexOf('.');
            if (dotIdx > 0 && dotIdx < normalized.length() - 1) {
                try {
                    String majorPart = normalized.substring(0, dotIdx);
                    int minor = Integer.parseInt(normalized.substring(dotIdx + 1));
                    nextVersion = majorPart + "." + (minor + 1);
                } catch (NumberFormatException ignored) {
                    nextVersion = normalized + ".1";
                }
            } else {
                try {
                    int major = Integer.parseInt(normalized);
                    nextVersion = major + ".1";
                } catch (NumberFormatException ignored) {
                    nextVersion = normalized + ".1";
                }
            }
        }
        return nextVersion;
    }

    @Override
    @Transactional
    public DocumentResponse updateApproval(UUID documentId, DocumentApprovalRequest request) {
        EventDocument doc = docRepo.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài liệu với ID: " + documentId));

        if (request.status() == ApprovalStatus.REJECTED
                && (request.rejectionReason() == null || request.rejectionReason().isBlank())) {
            throw new IllegalArgumentException("Bắt buộc phải nhập lý do từ chối phê duyệt");
        }

        doc.setStatus(request.status());
        doc.setApprovedBy(request.approvedBy());
        doc.setApprovedAt(OffsetDateTime.now());
        doc.setRejectionReason(request.status() == ApprovalStatus.REJECTED ? request.rejectionReason() : null);

        EventDocument updated = docRepo.save(doc);
        return docMapper.toResponse(updated);
    }
}
