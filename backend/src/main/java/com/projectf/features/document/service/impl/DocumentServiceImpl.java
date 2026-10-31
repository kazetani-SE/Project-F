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
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentServiceImpl implements DocumentService {

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
        if (request.parentDocumentId() != null) {
            boolean parentExists = docRepo.existsById(request.parentDocumentId());
            if (!parentExists) {
                throw new IllegalArgumentException("Tài liệu phiên bản gốc không tồn tại: " + request.parentDocumentId());
            }
        }

        EventDocument entity = docMapper.toEntity(eventId, request);
        EventDocument saved = docRepo.save(entity);
        return docMapper.toResponse(saved);
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
