package com.projectf.common.security;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.exception.ApiException;
import com.projectf.features.event.entity.EventRole;
import com.projectf.features.event.repository.EventOrganizerRepository;
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
    private final EventOrganizerRepository organizers;

    public AccessPolicy(MemberService members, EventOrganizerRepository organizers) {
        this.members = members;
        this.organizers = organizers;
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
                || organizers.existsByEventIdAndMemberId(eventId, member.id())).orElse(false);
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
        return findActiveMember(authentication).map(member -> hasRole(eventId, member.id(), EventRole.LEAD_HEADER))
                .orElse(false);
    }

    public boolean canManageEvent(UUID eventId, Authentication authentication) {
        return findActiveMember(authentication).map(member -> hasAdminRole(member.clubRole())
                || hasRole(eventId, member.id(), EventRole.LEAD_HEADER)).orElse(false);
    }

    public boolean hasEventRole(UUID eventId, Authentication authentication, String role) {
        boolean allowed;
        try {
            EventRole eventRole = EventRole.valueOf(role);
            allowed = findActiveMember(authentication).map(member -> hasAdminRole(member.clubRole())
                    || hasRole(eventId, member.id(), eventRole)).orElse(false);
        } catch (IllegalArgumentException exception) {
            allowed = false;
        }
        return allowed;
    }

    public UUID currentMemberId() {
        return findActiveMember(SecurityContextHolder.getContext().getAuthentication())
                .orElseThrow(AccessPolicy::forbidden).id();
    }

    public void requireEvent(UUID eventId) {
        // Dữ liệu nội bộ theo mùa chỉ dành cho Ban Chủ nhiệm hoặc BTC của chính mùa đó.
        if (!canAccessEvent(eventId, SecurityContextHolder.getContext().getAuthentication())) {
            throw forbidden();
        }
    }

    private boolean hasRole(UUID eventId, UUID memberId, EventRole role) {
        return organizers.findByEventIdAndMemberId(eventId, memberId)
                .map(organizer -> organizer.getRole() == role).orElse(false);
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
