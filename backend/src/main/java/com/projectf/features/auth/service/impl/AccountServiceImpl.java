package com.projectf.features.auth.service.impl;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.security.AccessPolicy;
import com.projectf.features.auth.dto.response.AccountResponse;
import com.projectf.features.auth.service.AccountService;
import com.projectf.features.auth.service.VerifiedEmail;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AccountServiceImpl implements AccountService {
    private final MemberService members;
    private final VerifiedEmail verifiedEmail;

    public AccountServiceImpl(MemberService members, VerifiedEmail verifiedEmail) {
        this.members = members;
        this.verifiedEmail = verifiedEmail;
    }

    @Override
    public AccountResponse resolve(Jwt jwt) {
        UUID authUserId = UUID.fromString(jwt.getSubject());
        MemberResponse member = members.findByAuthUserId(authUserId)
                .or(() -> members.claimAccount(authUserId, verifiedEmail.forToken(jwt)))
                .filter(linked -> Boolean.TRUE.equals(linked.active()))
                .orElseThrow(AccessPolicy::forbidden);
        ClubRole role = member.clubRole() == null ? ClubRole.MEMBER : member.clubRole();
        return new AccountResponse(member.id(), member.fullName(), member.email(), role);
    }
}
