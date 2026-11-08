package com.projectf;

import com.projectf.common.enums.ClubRole;
import com.projectf.features.auth.service.VerifiedEmail;
import com.projectf.features.document.dto.response.DocumentResponse;
import com.projectf.features.document.service.DocumentService;
import com.projectf.features.finance.dto.response.ExpenseResponse;
import com.projectf.features.finance.service.ExpenseService;
import com.projectf.features.knowledge.dto.response.IncidentResponse;
import com.projectf.features.knowledge.service.IncidentService;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.repository.ClubMemberRepository;
import java.util.List;
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

    @MockBean
    private DocumentService documents;

    @MockBean
    private ExpenseService expenses;

    @MockBean
    private IncidentService incidents;

    @Test
    void membersRejectUnauthenticatedRequestsWithJsonEnvelope() throws Exception {
        mvc.perform(get("/v1/members"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
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
        mvc.perform(get("/v1/events/{eventId}/feedbacks", eventId)
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
    void directResourceIdsUseTheOwningEventForAuthorization() throws Exception {
        UUID subject = UUID.randomUUID();
        UUID resourceId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        ClubMember member = member(ClubRole.MEMBER, true);
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(member));

        DocumentResponse document = new DocumentResponse(resourceId, eventId, null, null, null, null, null,
                null, null, null, null, null, null, null);
        when(documents.getDocumentById(resourceId)).thenReturn(document);
        ExpenseResponse expense = new ExpenseResponse(resourceId, eventId, null, null, null, null, null,
                null, null, null, null, null, null, null, null, List.of());
        when(expenses.getExpenseById(resourceId)).thenReturn(expense);
        IncidentResponse incident = new IncidentResponse(resourceId, eventId, null, null, null, List.of(),
                null, null, null, null, null);
        when(incidents.getIncidentById(resourceId)).thenReturn(incident);

        var token = jwt().jwt(builder -> builder.subject(subject.toString()));
        for (String path : new String[]{"/v1/documents/{id}", "/v1/finance/expenses/{id}", "/v1/incidents/{id}"}) {
            mvc.perform(get(path, resourceId).with(token)).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
        }
        when(organizers.existsByEventIdAndMemberId(eventId, member.getId())).thenReturn(true);
        mvc.perform(get("/v1/documents/{id}", resourceId).with(token)).andExpect(status().isOk());
    }

    @Test
    void unlistedEmailCannotBootstrapOrCallBusinessApi() throws Exception {
        UUID subject = UUID.randomUUID();
        when(verifiedEmail.forToken(any())).thenReturn("unlisted@example.test");
        var token = jwt().jwt(builder -> builder.subject(subject.toString()));
        mvc.perform(get("/v1/auth/me").with(token)).andExpect(status().isForbidden());
        mvc.perform(get("/v1/members").with(token)).andExpect(status().isForbidden());
    }

    @Test
    void memberCannotPresignAnUnversionedOrMutableAttachment() throws Exception {
        UUID subject = UUID.randomUUID();
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(member(ClubRole.MEMBER, true)));
        var token = jwt().jwt(builder -> builder.subject(subject.toString()));
        for (String reference : List.of("documents/plan.pdf", "documents/plan.pdf?versionId=%20",
                "documents/plan.pdf?versionId=null")) {
            mvc.perform(get("/v1/storage/presigned-download").param("objectKey", reference).with(token))
                    .andExpect(status().isForbidden());
        }
    }

    private static ClubMember member(ClubRole role, boolean active) {
        ClubMember member = new ClubMember();
        member.setId(UUID.randomUUID());
        member.setActive(active);
        member.setClubRole(role);
        return member;
    }
}
