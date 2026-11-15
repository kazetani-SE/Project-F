package com.projectf.common.security;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.exception.ApiException;
import com.projectf.features.event.service.EventMembership;
import com.projectf.features.event.entity.EventRole;
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

    public boolean canAccessEvent(UUID eventId, Authentication authentication) {
        return findActiveMember(authentication).map(member -> hasAdminRole(member.clubRole())
                || membership.hasAssignment(eventId, member.id())).orElse(false);
    }

    public boolean canAccessEvent(String eventId, Authentication authentication) {
        boolean allowed;
        try {
            allowed = canAccessEvent(UUID.fromString(eventId), authentication);
        } catch (IllegalArgumentException exception) {
            allowed = false;
        }
        return allowed;
    }

    public boolean isEventLead(UUID eventId, Authentication authentication) {
        return findActiveMember(authentication).map(member -> membership.hasRole(eventId, member.id(), EventRole.LEAD_HEADER))
                .orElse(false);
    }

    public UUID currentMemberId() {
        return findActiveMember(SecurityContextHolder.getContext().getAuthentication())
                .orElseThrow(AccessPolicy::forbidden).id();
    }

    public void requireEvent(UUID eventId) {
        // Dữ liệu nội bộ theo mùa chỉ dành cho Ban Chủ nhiệm hoặc BTC của chính mùa đó.
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
        Optional<MemberResponse> result = Optional.empty();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            try {
                result = members.findByAuthUserId(UUID.fromString(jwt.getSubject()))
                        .filter(member -> Boolean.TRUE.equals(member.active()));
            } catch (IllegalArgumentException exception) {
                result = Optional.empty();
            }
        }
        return result;
    }
}
