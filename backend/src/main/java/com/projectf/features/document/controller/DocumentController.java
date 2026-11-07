package com.projectf.features.document.controller;

import com.projectf.common.response.ApiResponse;
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

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/events/{eventId}/documents")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getDocumentsByEvent(
            @PathVariable("eventId") UUID eventId
    ) {
        List<DocumentResponse> response = documentService.getDocumentsByEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/events/{eventId}/documents")
    public ResponseEntity<ApiResponse<DocumentResponse>> createDocument(
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody CreateDocumentRequest request
    ) {
        DocumentResponse response = documentService.createDocument(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDocumentById(
            @PathVariable("documentId") UUID documentId
    ) {
        DocumentResponse response = documentService.getDocumentById(documentId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping({"/events/{eventId}/documents/{documentId}/approval", "/documents/{documentId}/approval"})
    public ResponseEntity<ApiResponse<DocumentResponse>> updateApproval(
            @PathVariable(value = "eventId", required = false) UUID eventId,
            @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody DocumentApprovalRequest request
    ) {
        DocumentResponse response = documentService.updateApproval(documentId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
