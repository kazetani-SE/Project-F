package com.projectf.common.security;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.exception.ApiException;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.repository.ClubMemberRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class AccessPolicy {
    private final ClubMemberRepository members;
    private final EventOrganizerRepository organizers;

    public AccessPolicy(ClubMemberRepository members, EventOrganizerRepository organizers) {
        this.members = members;
        this.organizers = organizers;
    }

    public boolean isActiveMember(Authentication authentication) {
        return findActiveMember(authentication).isPresent();
    }

    public boolean isAdmin(Authentication authentication) {
        return findActiveMember(authentication).map(ClubMember::getClubRole).map(AccessPolicy::hasAdminRole)
                .orElse(false);
    }

    public boolean isAdmin() {
        return isAdmin(SecurityContextHolder.getContext().getAuthentication());
    }

    public UUID currentMemberId() {
        return findActiveMember(SecurityContextHolder.getContext().getAuthentication())
                .orElseThrow(AccessPolicy::forbidden).getId();
    }

    public void requireEvent(UUID eventId) {
        if (!isAdmin() && !organizers.existsByEventIdAndMemberId(eventId, currentMemberId())) {
            throw forbidden();
        }
    }

    public void requireSeries(UUID seriesId) {
        if (!isAdmin() && !organizers.hasAssignmentInSeries(seriesId, currentMemberId())) {
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

    private Optional<ClubMember> findActiveMember(Authentication authentication) {
        return authentication != null && authentication.getPrincipal() instanceof Jwt jwt
                ? members.findByAuthUserId(UUID.fromString(jwt.getSubject()))
                        .filter(member -> Boolean.TRUE.equals(member.getActive()))
                : Optional.empty();
    }
}
