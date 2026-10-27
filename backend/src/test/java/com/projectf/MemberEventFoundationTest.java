package com.projectf;

import com.projectf.common.enums.Department;
import com.projectf.features.event.dto.request.CreateEventRequest;
import com.projectf.features.event.dto.request.UpdateEventRequest;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.mapper.EventMapper;
import com.projectf.features.member.dto.request.CreateMemberRequest;
import com.projectf.features.member.dto.request.UpdateMemberRequest;
import com.projectf.features.member.entity.ClubMember;
import com.projectf.features.member.mapper.MemberMapper;
import jakarta.persistence.Table;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemberEventFoundationTest {
    @Test
    void memberRequestRejectsInvalidStudentIdAndEmail() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var request = new CreateMemberRequest("123", "Nguyen Van A", "not-an-email",
                    null, Department.HR, null, "K18");
            var invalidFields = factory.getValidator().validate(request).stream()
                    .map(violation -> violation.getPropertyPath().toString()).toList();
            assertTrue(invalidFields.contains("studentId"));
            assertTrue(invalidFields.contains("email"));
        }
    }

    @Test
    void eventRequestRejectsNegativeFund() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var request = new CreateEventRequest(UUID.randomUUID(), "2026", "Project F", null,
                    LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2), new BigDecimal("-1"));
            assertFalse(factory.getValidator().validate(request).isEmpty());
        }
    }

    @Test
    void eventRequestsRejectInvalidDateRanges() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var start = LocalDate.of(2026, 11, 2);
            var end = LocalDate.of(2026, 11, 1);
            var create = new CreateEventRequest(null, "2026", "Project F", null, start, end, BigDecimal.ZERO);
            var update = new UpdateEventRequest(null, "2026", "Project F", null, end, start,
                    start, end, null, BigDecimal.ZERO);
            assertTrue(factory.getValidator().validate(create).stream()
                    .anyMatch(violation -> violation.getPropertyPath().toString().equals("expectedDateRangeValid")));
            assertTrue(factory.getValidator().validate(update).stream()
                    .anyMatch(violation -> violation.getPropertyPath().toString().equals("actualDateRangeValid")));
        }
    }

    @Test
    void memberMapperUpdatesActiveWhenProvided() {
        var member = new ClubMember();
        member.setActive(true);
        var request = new UpdateMemberRequest("Nguyen Van A", "a@example.com", null,
                Department.HR, null, "K18", false);
        new MemberMapper().update(member, request);
        assertFalse(member.getActive());
    }

    @Test
    void mappersExposeIdsWithoutReturningEntities() {
        var member = new ClubMember();
        member.setId(UUID.randomUUID());
        member.setFullName("Nguyen Van A");
        var event = new Event();
        event.setId(UUID.randomUUID());
        event.setSeriesId(UUID.randomUUID());
        assertEquals(member.getId(), new MemberMapper().toResponse(member).id());
        assertEquals(event.getSeriesId(), new EventMapper().toResponse(event).seriesId());
        var request = new CreateEventRequest(event.getSeriesId(), "2026", "Project F", null,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2), new BigDecimal("100.00"));
        assertEquals(new BigDecimal("100.00"), new EventMapper().toEntity(request).getAllocatedFund());
        assertEquals("club_members", ClubMember.class.getAnnotation(Table.class).name());
        assertEquals("events", Event.class.getAnnotation(Table.class).name());
    }
}
