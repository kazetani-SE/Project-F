package com.projectf.features.auth.service;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.security.AccessPolicy;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.repository.ClubMemberRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AccountService {
    private final ClubMemberRepository members;
    private final VerifiedEmail verifiedEmail;

    public AccountService(ClubMemberRepository members, VerifiedEmail verifiedEmail) {
        this.members = members;
        this.verifiedEmail = verifiedEmail;
    }

    public Account resolve(Jwt jwt) {
        UUID authUserId = UUID.fromString(jwt.getSubject());
        ClubMember member = members.findByAuthUserId(authUserId).orElseGet(() -> claim(jwt, authUserId));
        if (!Boolean.TRUE.equals(member.getActive())) {
            throw AccessPolicy.forbidden();
        }
        ClubRole role = member.getClubRole() == null ? ClubRole.MEMBER : member.getClubRole();
        return new Account(member.getId(), member.getFullName(), member.getEmail(), role);
    }

    private ClubMember claim(Jwt jwt, UUID authUserId) {
        // API §2: đối chiếu email đã xác nhận trước khi thực hiện liên kết có điều kiện trong CSDL.
        String email = verifiedEmail.forToken(jwt);
        Optional<ClubMember> linked;
        try {
            members.claimAccount(authUserId, email);
            linked = members.findByAuthUserId(authUserId);
        } catch (DataIntegrityViolationException conflict) {
            // Một yêu cầu đăng nhập đồng thời có thể đã liên kết cùng tài khoản.
            linked = Optional.of(members.findByAuthUserId(authUserId)
                    .orElseThrow(() -> AccessPolicy.forbidden(conflict)));
        }
        return linked.orElseThrow(AccessPolicy::forbidden);
    }

    public record Account(UUID id, String fullName, String email, ClubRole clubRole) { }
}
