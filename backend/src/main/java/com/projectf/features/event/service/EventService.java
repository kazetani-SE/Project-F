package com.projectf.features.event.service;

import com.projectf.common.response.PageResponse;
import com.projectf.features.event.dto.request.EventRequest;
import com.projectf.features.event.dto.request.EventStatusRequest;
import com.projectf.features.event.dto.request.EventUpdateRequest;
import com.projectf.features.event.dto.request.OrganizerRequest;
import com.projectf.features.event.dto.request.SeriesRequest;
import com.projectf.features.event.dto.response.EventResponse;
import com.projectf.features.event.dto.response.OrganizerResponse;
import com.projectf.features.event.dto.response.SeriesDetailResponse;
import com.projectf.features.event.dto.response.SeriesResponse;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.entity.EventSeries;
import java.util.List;
import java.util.UUID;

public interface EventService {
    PageResponse<SeriesResponse> series(int page, int size);
    SeriesDetailResponse seriesDetail(UUID id);
    SeriesResponse createSeries(SeriesRequest request);
    PageResponse<EventResponse> events(UUID seriesId, String status, int page, int size);
    EventResponse event(UUID id);
    EventResponse createEvent(EventRequest request);
    EventResponse updateEvent(UUID id, EventUpdateRequest request);
    EventResponse status(UUID id, EventStatusRequest request);
    List<OrganizerResponse> organizers(UUID eventId);
    OrganizerResponse addOrganizer(UUID eventId, OrganizerRequest request);
    void removeOrganizer(UUID eventId, UUID memberId);
    Event requireEvent(UUID id);
    EventSeries requireSeries(UUID id);
    Event lockEvent(UUID id);
    UUID previousCompletedEvent(UUID id);
}
