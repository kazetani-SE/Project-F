package com.projectf.features.document.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.common.security.AccessPolicy;
import com.projectf.features.document.dto.request.CreateDocumentRequest;
import com.projectf.features.document.dto.request.DocumentApprovalRequest;
import com.projectf.features.document.dto.response.DocumentResponse;
import com.projectf.features.document.service.DocumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Document", description = "Quản lý hồ sơ, tài liệu sự kiện và luồng duyệt")
@RestController
@RequestMapping("/v1")
public class DocumentController {

    private static final String EVENT_ID = "eventId";
    private static final String DOCUMENT_ID = "documentId";

    private final DocumentService documentService;

    private final AccessPolicy access;

    public DocumentController(DocumentService documentService, AccessPolicy access) {
        this.documentService = documentService;
        this.access = access;
    }

    @GetMapping("/events/{eventId}/documents")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getDocumentsByEvent(
            @PathVariable(EVENT_ID) UUID eventId
    ) {
        List<DocumentResponse> response = documentService.getDocumentsByEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/events/{eventId}/documents")
    public ResponseEntity<ApiResponse<DocumentResponse>> createDocument(
            @PathVariable(EVENT_ID) UUID eventId,
            @Valid @RequestBody CreateDocumentRequest request
    ) {
        DocumentResponse response = documentService.createDocument(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDocumentById(
            @PathVariable(DOCUMENT_ID) UUID documentId
    ) {
        DocumentResponse response = documentService.getDocumentById(documentId);
        access.requireEvent(response.eventId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping({"/events/{eventId}/documents/{documentId}/approval", "/documents/{documentId}/approval"})
    public ResponseEntity<ApiResponse<DocumentResponse>> updateApproval(
            @PathVariable(value = EVENT_ID, required = false) UUID eventId,
            @PathVariable(DOCUMENT_ID) UUID documentId,
            @Valid @RequestBody DocumentApprovalRequest request
    ) {
        DocumentResponse response = documentService.updateApproval(documentId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping({"/events/{eventId}/documents/{documentId}", "/documents/{documentId}"})
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable(value = EVENT_ID, required = false) UUID eventId,
            @PathVariable(DOCUMENT_ID) UUID documentId
    ) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
