package com.projectf;

import com.projectf.common.enums.ClubRole;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventStatus;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.repository.ClubMemberRepository;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class CoreDomainRoutesTest extends ProjectFApplicationTests {
    @Autowired private MockMvc mvc;
    @Autowired private ClubMemberRepository members;
    @Autowired private EventRepository events;
    @Autowired private EventOrganizerRepository organizers;

    @Test
    void memberStatusWritesAnInactivationTimestamp() throws Exception {
        var member = new ClubMember();
        member.setId(UUID.randomUUID());
        member.setActive(true);
        when(members.findByIdForUpdate(member.getId())).thenReturn(Optional.of(member));
        when(members.saveAndFlush(any())).thenReturn(member);

        mvc.perform(patch("/v1/members/{id}/status", member.getId()).with(adminToken())
                .contentType(MediaType.APPLICATION_JSON).content("{\"isActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.inactiveAt").isString());
    }

    @Test
    void duplicateStudentIdsReturnTheConflictEnvelope() throws Exception {
        when(members.existsByStudentIdIgnoreCase("SE000001")).thenReturn(true);
        mvc.perform(post("/v1/members").with(adminToken())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"studentId":"se000001","fullName":"Duplicate Member","email":"valid@example.test","batch":"K20"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"));
    }

    @Test
    void anEventCannotSkipApproval() throws Exception {
        var event = new Event();
        event.setId(UUID.randomUUID());
        event.setStatus(EventStatus.PLANNING);
        event.setExpectedStartDate(LocalDate.of(2026, 11, 10));
        event.setExpectedEndDate(LocalDate.of(2026, 11, 11));
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));

        mvc.perform(patch("/v1/events/{id}/status", event.getId()).with(adminToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\",\"actualStartDate\":\"2026-11-10\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    void startingRequiresAnActualStartDateInTheRequest() throws Exception {
        var event = new Event();
        event.setId(UUID.randomUUID());
        event.setStatus(EventStatus.APPROVED);
        event.setActualStartDate(LocalDate.of(2026, 11, 10));
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));

        mvc.perform(patch("/v1/events/{id}/status", event.getId()).with(adminToken())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_EVENT_DATES"));
    }

    @Test
    void eventEditPreservesActualDatesAndCannotChangeStatus() throws Exception {
        var event = new Event();
        event.setId(UUID.randomUUID());
        event.setStatus(EventStatus.IN_PROGRESS);
        event.setActualStartDate(LocalDate.of(2026, 11, 10));
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(events.saveAndFlush(event)).thenReturn(event);
        var admin = adminToken();

        String fields = """
                "seasonName":"2026","title":"New title","expectedStartDate":"2026-11-10",
                "expectedEndDate":"2026-11-11"
                """;
        mvc.perform(put("/v1/events/{id}", event.getId()).with(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{" + fields + ",\"status\":\"COMPLETED\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/v1/events/{id}", event.getId()).with(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{" + fields + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.actualStartDate").value("2026-11-10"));
    }

    @Test
    void organizerAssignmentUsesTheEventFromTheUrl() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        var member = new ClubMember();
        member.setId(memberId);
        member.setFullName("Organizer Name");
        when(members.findByIdForUpdate(memberId)).thenReturn(Optional.of(member));
        when(events.existsById(eventId)).thenReturn(true);
        when(organizers.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0, EventOrganizer.class));

        mvc.perform(post("/v1/events/{id}/organizers", eventId).with(adminToken())
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"eventId":"%s","memberId":"%s","role":"MASTER_PLAN"}
                        """.formatted(UUID.randomUUID(), memberId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.eventId").value(eventId.toString()))
                .andExpect(jsonPath("$.data.memberName").value("Organizer Name"))
                .andExpect(jsonPath("$.data.role").value("MASTER_PLAN"));
    }

    private JwtRequestPostProcessor adminToken() {
        UUID subject = UUID.randomUUID();
        var admin = new ClubMember();
        admin.setId(UUID.randomUUID());
        admin.setClubRole(ClubRole.PRESIDENT);
        when(members.findByAuthUserId(subject)).thenReturn(Optional.of(admin));
        return jwt().jwt(token -> token.subject(subject.toString()));
    }
}
