package com.projectf.features.document.service;

import com.projectf.features.document.dto.request.CreateDocumentRequest;
import com.projectf.features.document.dto.request.DocumentApprovalRequest;
import com.projectf.features.document.dto.response.DocumentResponse;
import java.util.List;
import java.util.UUID;

public interface DocumentService {
    List<DocumentResponse> getDocumentsByEvent(UUID eventId);

    DocumentResponse getDocumentById(UUID documentId);

    DocumentResponse createDocument(UUID eventId, CreateDocumentRequest request);

    DocumentResponse updateApproval(UUID documentId, DocumentApprovalRequest request);
}
