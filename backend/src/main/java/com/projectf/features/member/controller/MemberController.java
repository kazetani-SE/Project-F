package com.projectf.features.member.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.common.response.PageResponse;
import com.projectf.common.utils.Paging;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.MemberFilterRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberStatusRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/v1/members")
public class MemberController {
    private static final Set<String> SORT_FIELDS = Set.of("id", "fullName", "studentId", "email", "department",
            "clubRole", "batch", "active", "createdAt", "inactiveAt");
    private static final Map<String, String> SORT_ALIASES = Map.of("isActive", "active", "role", "clubRole");
    private final MemberService members;

    public MemberController(MemberService members) {
        this.members = members;
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
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberResponse> create(@Valid @RequestBody CreateMemberRequest request) {
        return ApiResponse.ok(members.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<MemberResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest request) {
        return ApiResponse.ok(members.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<MemberResponse> updateStatus(
            @PathVariable UUID id, @Valid @RequestBody UpdateMemberStatusRequest request) {
        return ApiResponse.ok(members.updateStatus(id, request.isActive()));
    }
}
