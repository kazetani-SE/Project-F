package com.projectf;

import com.projectf.common.enums.ClubRole;
import com.projectf.features.auth.service.VerifiedEmail;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.repository.ClubMemberRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CoreApiTest extends ProjectFApplicationTests {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private ClubMemberRepository members;

    @Autowired
    private EventOrganizerRepository organizers;

    @MockBean
    private VerifiedEmail verifiedEmail;

    @Test
    void membersRejectUnauthenticatedRequestsWithJsonEnvelope() throws Exception {
        mvc.perform(get("/v1/members"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void importEndpointsRequireAdminRole() throws Exception {
        mvc.perform(get("/v1/members/import/template")).andExpect(status().isUnauthorized());
        UUID subject = UUID.randomUUID();
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(member(ClubRole.MEMBER, true)));
        var token = jwt().jwt(builder -> builder.subject(subject.toString()));
        mvc.perform(get("/v1/members/import/template").with(token)).andExpect(status().isForbidden());
        mvc.perform(post("/v1/members/import").with(token)).andExpect(status().isForbidden());
        mvc.perform(post("/v1/members/{id}/credentials/provision", UUID.randomUUID()).with(token))
                .andExpect(status().isForbidden());
    }

    @Test
    void eventListRejectsAnInvalidBearer() throws Exception {
        mvc.perform(get("/v1/events").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void linkedMemberCannotWriteOrReadAnUnassignedEvent() throws Exception {
        UUID subject = UUID.randomUUID();
        ClubMember member = member(ClubRole.MEMBER, true);
        UUID eventId = UUID.randomUUID();
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(member));
        when(organizers.existsByEventIdAndMemberId(eventId, member.getId())).thenReturn(false);
        mvc.perform(post("/v1/members").with(jwt().jwt(token -> token.subject(subject.toString()))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/v1/events/{eventId}", eventId)
                        .with(jwt().jwt(token -> token.subject(subject.toString()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void firstLoginClaimsVerifiedEmailAndReturnsDatabaseRole() throws Exception {
        UUID subject = UUID.randomUUID();
        ClubMember member = member(ClubRole.VICEPRESIDENT, true);
        when(members.findByAuthUserId(subject)).thenReturn(Optional.empty(), Optional.of(member));
        when(verifiedEmail.forToken(any())).thenReturn("verified@example.test");
        when(members.claimAccount(subject, "verified@example.test")).thenReturn(1);
        mvc.perform(get("/v1/auth/me").with(jwt().jwt(token -> token.subject(subject.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(member.getId().toString()))
                .andExpect(jsonPath("$.data.clubRole").value("VICEPRESIDENT"));
    }

    @Test
    void inactiveMemberIsDeniedEvenWithAnExistingSession() throws Exception {
        UUID subject = UUID.randomUUID();
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(member(ClubRole.PRESIDENT, false)));
        mvc.perform(get("/v1/auth/me").with(jwt().jwt(token -> token.subject(subject.toString()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void taskOneJwtPolicyDoesNotOpenOtherSlicesInNonDevProfiles() throws Exception {
        UUID subject = UUID.randomUUID();
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(member(ClubRole.PRESIDENT, true)));
        var token = jwt().jwt(builder -> builder.subject(subject.toString()));
        mvc.perform(get("/v1/finance/categories").with(token)).andExpect(status().isForbidden());
        mvc.perform(get("/v1/events/{eventId}/documents", UUID.randomUUID()).with(token))
                .andExpect(status().isForbidden());
    }

    @Test
    void unlistedEmailCannotBootstrapOrCallBusinessApi() throws Exception {
        UUID subject = UUID.randomUUID();
        when(verifiedEmail.forToken(any())).thenReturn("unlisted@example.test");
        var token = jwt().jwt(builder -> builder.subject(subject.toString()));
        mvc.perform(get("/v1/auth/me").with(token)).andExpect(status().isForbidden());
        mvc.perform(get("/v1/members").with(token)).andExpect(status().isForbidden());
    }

    private static ClubMember member(ClubRole role, boolean active) {
        ClubMember member = new ClubMember();
        member.setId(UUID.randomUUID());
        member.setActive(active);
        member.setClubRole(role);
        return member;
    }
}
