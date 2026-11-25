package com.projectf;

import com.projectf.common.enums.ClubRole;
import com.projectf.common.security.AccessPolicy;
import com.projectf.common.security.EventRoleSecurityConfig;
import com.projectf.common.security.RequireEventRoles;
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventRole;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EventRoleAuthorizationTest {
    private final UUID event = UUID.randomUUID();
    private final UUID member = UUID.randomUUID();
    private final UUID subject = UUID.randomUUID();
    private final MemberService members = mock(MemberService.class);
    private final EventOrganizerRepository organizers = mock(EventOrganizerRepository.class);
    private AnnotationConfigApplicationContext context;
    private Actions actions;

    @BeforeEach
    void setup() {
        context = new AnnotationConfigApplicationContext();
        context.registerBean(AccessPolicy.class, () -> new AccessPolicy(members, organizers));
        context.register(EventRoleSecurityConfig.class, Actions.class);
        context.refresh();
        actions = context.getBean(Actions.class);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                Jwt.withTokenValue("token").header("alg", "RS256").subject(subject.toString())
                        .claim("role", "LEAD_HEADER").build()));
        active(true);
        role(EventRole.PLAN);
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        context.close();
    }

    @Test void acceptsAnyListedEventRole() { assertEquals("ok", actions.edit(event)); }
    @Test void rejectsWrongRoleDespiteJwtRoleClaim() {
        role(EventRole.MEDIA);
        assertThrows(AccessDeniedException.class, () -> actions.edit(event));
    }
    @Test void rejectsAnotherEvent() {
        when(organizers.findByEventIdAndMemberId(any(), eq(member))).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> actions.edit(UUID.randomUUID()));
    }
    @Test void rejectsInactiveMember() {
        active(false);
        assertThrows(AccessDeniedException.class, () -> actions.edit(event));
    }
    @Test void clubPresidentCannotBypassEventRole() {
        role(EventRole.MEMBER);
        assertThrows(AccessDeniedException.class, () -> actions.edit(event));
    }
    @Test void observesRoleChangesImmediately() {
        assertEquals("ok", actions.edit(event));
        role(EventRole.MEDIA);
        assertThrows(AccessDeniedException.class, () -> actions.edit(event));
    }
    @Test void rejectsMissingAuthentication() {
        SecurityContextHolder.clearContext();
        assertThrows(org.springframework.security.authentication.AuthenticationCredentialsNotFoundException.class,
                () -> actions.edit(event));
    }
    @Test void emptyRoleListDeniesAccess() {
        assertThrows(AccessDeniedException.class, () -> actions.denied(event));
    }
    @Test void acceptsEventMemberWhenExplicitlyListed() {
        role(EventRole.MEMBER);
        assertEquals("ok", actions.read(event));
    }

    private void active(boolean active) {
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(new MemberResponse(member,
                "SE1", "Member", "test@example.test", null, null, ClubRole.PRESIDENT, "K20", active, null, null)));
    }
    private void role(EventRole role) {
        EventOrganizer organizer = new EventOrganizer();
        organizer.setRole(role);
        when(organizers.findByEventIdAndMemberId(event, member)).thenReturn(Optional.of(organizer));
    }
    public static class Actions {
        @RequireEventRoles(eventId = "#eventId", value = {EventRole.LEAD_HEADER, EventRole.PLAN})
        public String edit(UUID eventId) { return "ok"; }
        @RequireEventRoles(eventId = "#eventId", value = {})
        public String denied(UUID eventId) { return "denied"; }
        @RequireEventRoles(eventId = "#eventId", value = EventRole.MEMBER)
        public String read(UUID eventId) { return "ok"; }
    }
}
