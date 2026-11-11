package com.projectf.features.member.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.common.response.PageResponse;
import com.projectf.common.utils.Paging;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.MemberFilterRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberStatusRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.dto.response.MemberImportReport;
import com.projectf.features.member.service.MemberImportService;
import com.projectf.features.member.service.MemberCredentialService;
import com.projectf.features.member.service.MemberService;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/members")
public class MemberController {
    private static final String ADMIN_RULE = "@accessPolicy.isAdmin(authentication)";
    private static final Set<String> SORT_FIELDS = Set.of("id", "fullName", "studentId", "email", "department",
            "clubRole", "batch", "active", "createdAt", "inactiveAt");
    private static final Map<String, String> SORT_ALIASES = Map.of("isActive", "active", "role", "clubRole");
    private final MemberService members;
    private final MemberImportService importer;
    private final MemberCredentialService credentials;

    public MemberController(MemberService members, MemberImportService importer, MemberCredentialService credentials) {
        this.members = members;
        this.importer = importer;
        this.credentials = credentials;
    }

    @GetMapping("/import/template")
    @PreAuthorize(ADMIN_RULE)
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=club-members-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(importer.template());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(ADMIN_RULE)
    public ApiResponse<MemberImportReport> importMembers(@RequestPart("file") MultipartFile file) {
        return ApiResponse.ok(importer.importFile(file));
    }

    @PostMapping("/{id}/credentials/resend")
    @PreAuthorize(ADMIN_RULE)
    public ApiResponse<Void> resendCredentials(@PathVariable UUID id) {
        credentials.resend(members.get(id));
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/credentials/provision")
    @PreAuthorize(ADMIN_RULE)
    public ApiResponse<String> provisionCredentials(@PathVariable UUID id) {
        String status;
        try {
            status = credentials.provision(members.get(id));
        } catch (org.springframework.mail.MailException exception) {
            status = "EMAIL_FAILED";
        }
        return ApiResponse.ok(status);
    }

    @GetMapping
    public ApiResponse<PageResponse<MemberResponse>> list(
            @ParameterObject @ModelAttribute MemberFilterRequest filters,
            @PageableDefault(sort = "fullName") Pageable pageable) {
        Pageable page = Paging.withStableSort(pageable, SORT_FIELDS, SORT_ALIASES);
        return ApiResponse.ok(PageResponse.from(members.list(filters, page)));
    }

    @GetMapping("/{id}")
    public ApiResponse<MemberResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(members.get(id));
    }

    @PostMapping
    @PreAuthorize(ADMIN_RULE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberResponse> create(@Valid @RequestBody CreateMemberRequest request) {
        return ApiResponse.ok(members.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(ADMIN_RULE)
    public ApiResponse<MemberResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest request) {
        return ApiResponse.ok(members.update(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(ADMIN_RULE)
    public ApiResponse<MemberResponse> updateStatus(
            @PathVariable UUID id, @Valid @RequestBody UpdateMemberStatusRequest request) {
        return ApiResponse.ok(members.updateStatus(id, request.isActive()));
    }
}
