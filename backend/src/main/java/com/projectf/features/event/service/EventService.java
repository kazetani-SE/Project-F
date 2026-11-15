package com.projectf.features.event.service;

import com.projectf.features.event.dto.request.AssignOrganizerRequest;
import com.projectf.features.event.dto.request.CreateEventRequest;
import com.projectf.features.event.dto.request.CreateEventSeriesRequest;
import com.projectf.features.event.dto.request.UpdateEventRequest;
import com.projectf.features.event.dto.request.UpdateEventSeriesRequest;
import com.projectf.features.event.dto.request.UpdateEventStatusRequest;
import com.projectf.features.event.dto.response.EventResponse;
import com.projectf.features.event.dto.response.EventRoleResponse;
import com.projectf.features.event.dto.response.EventSeriesDetailResponse;
import com.projectf.features.event.dto.response.EventSeriesResponse;
import com.projectf.features.event.dto.response.OrganizerResponse;
import com.projectf.features.event.entity.EventStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EventService {
    EventSeriesResponse createSeries(CreateEventSeriesRequest request);
    EventSeriesDetailResponse getSeries(UUID seriesId, EventStatus status);
    Page<EventSeriesResponse> listSeries(Pageable pageable);
    EventSeriesResponse updateSeries(UUID seriesId, UpdateEventSeriesRequest request);
    EventResponse create(CreateEventRequest request);
    EventResponse get(UUID eventId);
    Page<EventResponse> list(UUID seriesId, EventStatus status, Pageable pageable);
    EventResponse update(UUID eventId, UpdateEventRequest request);
    EventResponse updateStatus(UUID eventId, UpdateEventStatusRequest request);
    EventRoleResponse getMyRole(UUID eventId);
    OrganizerResponse assign(UUID eventId, AssignOrganizerRequest request);
    List<OrganizerResponse> listOrganizers(UUID eventId);
    void removeOrganizer(UUID eventId, UUID memberId);
}
