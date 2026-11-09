package com.projectf.common.security;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.exception.ApiException;
import com.projectf.features.event.service.EventMembership;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class AccessPolicy {
    private final MemberService members;
    private final EventMembership membership;

    public AccessPolicy(MemberService members, EventMembership membership) {
        this.members = members;
        this.membership = membership;
    }

    public boolean isActiveMember(Authentication authentication) {
        return findActiveMember(authentication).isPresent();
    }

    public boolean isAdmin(Authentication authentication) {
        return findActiveMember(authentication).map(MemberResponse::clubRole).map(AccessPolicy::hasAdminRole)
                .orElse(false);
    }

    public boolean isAdmin() {
        return isAdmin(SecurityContextHolder.getContext().getAuthentication());
    }

    public UUID currentMemberId() {
        return findActiveMember(SecurityContextHolder.getContext().getAuthentication())
                .orElseThrow(AccessPolicy::forbidden).id();
    }

    public void requireEvent(UUID eventId) {
        // API §2: trong Slice 1, thành viên thường phải có phân công BTC để xem mùa.
        if (!isAdmin() && !membership.hasAssignment(eventId, currentMemberId())) {
            throw forbidden();
        }
    }

    public static boolean hasAdminRole(ClubRole role) {
        return role == ClubRole.PRESIDENT || role == ClubRole.VICEPRESIDENT;
    }

    public static ApiException forbidden() {
        return forbidden(null);
    }

    public static ApiException forbidden(Throwable cause) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied", cause);
    }

    private Optional<MemberResponse> findActiveMember(Authentication authentication) {
        // JWT xác thực danh tính. Vai trò và trạng thái hoạt động lấy từ hồ sơ CLB hiện hành.
        return authentication != null && authentication.getPrincipal() instanceof Jwt jwt
                ? members.findByAuthUserId(UUID.fromString(jwt.getSubject()))
                        .filter(member -> Boolean.TRUE.equals(member.active()))
                : Optional.empty();
    }
}
