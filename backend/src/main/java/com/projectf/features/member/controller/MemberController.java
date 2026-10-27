package com.projectf.features.member.controller;
import com.projectf.common.response.ApiResponse;
import com.projectf.common.response.PageResponse;
import com.projectf.common.security.AccessService;
import com.projectf.features.member.dto.request.MemberRequest;
import com.projectf.features.member.dto.request.MemberStatusRequest;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/v1")
public class MemberController {
    private final MemberService service;
    private final AccessService access;
    public MemberController(final MemberService service, final AccessService access) { this.service = service; this.access = access; }
    @GetMapping("/auth/me") public ApiResponse<MemberResponse> me() { return ApiResponse.ok(service.get(access.memberId())); }
    @GetMapping("/members") public ApiResponse<PageResponse<MemberResponse>> list(
            @RequestParam(required = false) final String department, @RequestParam(required = false) final String role,
            @RequestParam(required = false) final String batch, @RequestParam(required = false) final Boolean isActive,
            @RequestParam(required = false) final String keyword, @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int size) {
        return ApiResponse.ok(service.list(department, role, batch, isActive, keyword, page, size));
    }
    @GetMapping("/members/{id}") public ApiResponse<MemberResponse> get(@PathVariable final UUID id) { return ApiResponse.ok(service.get(id)); }
    @PostMapping("/members") public ResponseEntity<ApiResponse<MemberResponse>> create(@Valid @RequestBody final MemberRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(body)));
    }
    @PutMapping("/members/{id}") public ApiResponse<MemberResponse> update(@PathVariable final UUID id, @Valid @RequestBody final MemberRequest body) { return ApiResponse.ok(service.update(id, body)); }
    @PatchMapping("/members/{id}/status") public ApiResponse<MemberResponse> status(@PathVariable final UUID id, @Valid @RequestBody final MemberStatusRequest body) { return ApiResponse.ok(service.status(id, body.isActive())); }
}
