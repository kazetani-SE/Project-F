package com.projectf.common.security;

import com.projectf.features.event.entity.EventRole;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.entity.ClubRole;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AccessService {
    private static final Set<EventRole> LEADS = Set.of(EventRole.HEAD_ORGANIZER, EventRole.VICE_ORGANIZER);
    private final HttpServletRequest request;
    private final EventOrganizerRepository organizers;
    public AccessService(final HttpServletRequest request, final EventOrganizerRepository organizers) {
        this.request = request;
        this.organizers = organizers;
    }
    public UUID memberId() { return member().getId(); }
    public ClubMember member() { return (ClubMember) request.getAttribute("member"); }
    public boolean clubAdmin() { return Set.of(ClubRole.PRESIDENT, ClubRole.VICEPRESIDENT).contains(member().getClubRole()); }
    public void requireClubAdmin() { if (!clubAdmin()) throw new SecurityException("FORBIDDEN"); }
    public void requireEventLead(final UUID eventId) { requireRole(eventId, LEADS); }
    public void requireFinanceLead(final UUID eventId) { requireRole(eventId, Set.of(EventRole.HEAD_ORGANIZER, EventRole.VICE_ORGANIZER, EventRole.LEAD_FINANCE)); }
    public void requireMediaLead(final UUID eventId) { requireRole(eventId, Set.of(EventRole.HEAD_ORGANIZER, EventRole.VICE_ORGANIZER, EventRole.LEAD_MEDIA)); }
    public void requireOrganizer(final UUID eventId) {
        if (!clubAdmin() && organizers.findByEventIdAndMemberId(eventId, memberId()).isEmpty()) throw new SecurityException("FORBIDDEN");
    }
    private void requireRole(final UUID eventId, final Set<EventRole> roles) {
        if (!clubAdmin() && organizers.findByEventIdAndMemberId(eventId, memberId()).filter(o -> roles.contains(o.getRole())).isEmpty()) throw new SecurityException("FORBIDDEN");
    }
}
