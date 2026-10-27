package com.projectf.common;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.projectf.common.security.AccessService;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.entity.ClubRole;
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventRole;
import com.projectf.features.event.repository.EventOrganizerRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class AccessServiceTest {
    @Test void financeLeadCanApproveFinanceButNotManageEvent() {
        var request = new MockHttpServletRequest();
        var member = new ClubMember();
        member.setId(UUID.randomUUID());
        member.setClubRole(ClubRole.MEMBER);
        request.setAttribute("member", member);
        var repository = mock(EventOrganizerRepository.class);
        var organizer = new EventOrganizer();
        organizer.setRole(EventRole.LEAD_FINANCE);
        var event = UUID.randomUUID();
        when(repository.findByEventIdAndMemberId(event, member.getId())).thenReturn(Optional.of(organizer));
        var access = new AccessService(request, repository);
        assertDoesNotThrow(() -> access.requireFinanceLead(event));
        assertThrows(SecurityException.class, () -> access.requireEventLead(event));
    }
}
