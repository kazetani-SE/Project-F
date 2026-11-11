package com.projectf.features.auth.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.auth.dto.response.AccountResponse;
import com.projectf.features.member.service.MemberService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {
    private final MemberService members;

    public AuthController(MemberService members) {
        this.members = members;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AccountResponse>> me(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(members.resolveAccount(jwt)));
    }
}
