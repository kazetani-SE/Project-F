package com.projectf.features.event.mapper;

import com.projectf.features.event.dto.request.EventRequest;
import com.projectf.features.event.dto.request.EventUpdateRequest;
import com.projectf.features.event.dto.request.OrganizerRequest;
import com.projectf.features.event.dto.request.SeriesRequest;
import com.projectf.features.event.dto.response.EventResponse;
import com.projectf.features.event.dto.response.OrganizerResponse;
import com.projectf.features.event.dto.response.SeriesResponse;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventSeries;
import com.projectf.features.member.entity.ClubMember;
import org.springframework.stereotype.Component;

@Component
public class EventMapper {
    public SeriesResponse toResponse(final EventSeries series) {
        return new SeriesResponse(series.getId(), series.getName(),
                series.getDescription(), series.getCreatedAt());
    }

    public EventResponse toResponse(final Event event) {
        return new EventResponse(event.getId(), event.getSeries() == null ? null : event.getSeries().getId(),
                event.getSeasonName(), event.getTitle(), event.getDescription(),
                event.getExpectedStartDate(), event.getExpectedEndDate(),
                event.getActualStartDate(), event.getActualEndDate(), event.getStatus(),
                event.getAllocatedFund(), event.getCreatedAt(), event.getUpdatedAt());
    }

    public OrganizerResponse toResponse(final EventOrganizer organizer) {
        return new OrganizerResponse(organizer.getId(), organizer.getEvent().getId(),
                organizer.getMember().getId(), organizer.getRole(),
                organizer.getAssignedTasks(), organizer.getJoinedAt());
    }

    public EventSeries createSeries(final SeriesRequest request) {
        final EventSeries series = new EventSeries();
        series.setName(request.name());
        series.setDescription(request.description());
        return series;
    }

    public Event createEvent(final EventRequest request, final EventSeries series) {
        final Event event = new Event();
        event.setSeries(series);
        event.setSeasonName(request.seasonName());
        event.setTitle(request.title());
        event.setDescription(request.description());
        event.setExpectedStartDate(request.expectedStartDate());
        event.setExpectedEndDate(request.expectedEndDate());
        event.setActualStartDate(request.actualStartDate());
        event.setActualEndDate(request.actualEndDate());
        event.setAllocatedFund(request.allocatedFund());
        return event;
    }

    public void updateEvent(final Event event, final EventUpdateRequest request,
            final EventSeries series) {
        if (request.seriesId() != null) event.setSeries(series);
        if (request.seasonName() != null) event.setSeasonName(request.seasonName());
        if (request.title() != null) event.setTitle(request.title());
        if (request.description() != null) event.setDescription(request.description());
        if (request.expectedStartDate() != null) event.setExpectedStartDate(request.expectedStartDate());
        if (request.expectedEndDate() != null) event.setExpectedEndDate(request.expectedEndDate());
        if (request.actualStartDate() != null) event.setActualStartDate(request.actualStartDate());
        if (request.actualEndDate() != null) event.setActualEndDate(request.actualEndDate());
        if (request.allocatedFund() != null) event.setAllocatedFund(request.allocatedFund());
    }

    public EventOrganizer createOrganizer(final Event event, final ClubMember member,
            final OrganizerRequest request) {
        final EventOrganizer organizer = new EventOrganizer();
        organizer.setEvent(event);
        organizer.setMember(member);
        organizer.setRole(request.role());
        organizer.setAssignedTasks(request.assignedTasks());
        return organizer;
    }
}
