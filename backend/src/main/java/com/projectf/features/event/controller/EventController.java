package com.projectf.features.event.controller;

import com.projectf.common.exception.ApiException;
import com.projectf.common.response.ApiResponse;
import com.projectf.common.response.PageResponse;
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
import com.projectf.features.event.service.EventService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class EventController {
    private static final Set<String> SERIES_SORT = Set.of("id", "name", "createdAt");
    private static final Set<String> EVENT_SORT = Set.of("id", "title", "seasonName", "status", "expectedStartDate",
            "expectedEndDate", "createdAt", "updatedAt");
    private final EventService events;

    public EventController(EventService events) {
        this.events = events;
    }

    @GetMapping("/event-series")
    public ApiResponse<PageResponse<EventSeriesResponse>> listSeries(@PageableDefault(sort = "name") Pageable pageable) {
        return ApiResponse.ok(PageResponse.from(events.listSeries(orderedPage(pageable, SERIES_SORT))));
    }

    @GetMapping("/event-series/{seriesId}")
    public ApiResponse<EventSeriesDetailResponse> getSeries(@PathVariable UUID seriesId,
                                                            @RequestParam(required = false) EventStatus status) {
        return ApiResponse.ok(events.getSeries(seriesId, status));
    }

    @PostMapping("/event-series")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<EventSeriesResponse> createSeries(@Valid @RequestBody CreateEventSeriesRequest request) {
        return ApiResponse.ok(events.createSeries(request));
    }

    @PutMapping("/event-series/{seriesId}")
    public ApiResponse<EventSeriesResponse> updateSeries(
            @PathVariable UUID seriesId, @Valid @RequestBody UpdateEventSeriesRequest request) {
        return ApiResponse.ok(events.updateSeries(seriesId, request));
    }

    @GetMapping("/events")
    public ApiResponse<PageResponse<EventResponse>> list(
            @RequestParam(required = false) UUID seriesId,
            @RequestParam(required = false) EventStatus status,
            @PageableDefault(sort = "expectedStartDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.ok(PageResponse.from(events.list(seriesId, status, orderedPage(pageable, EVENT_SORT))));
    }

    @GetMapping("/events/{eventId}")
    public ApiResponse<EventResponse> get(@PathVariable UUID eventId) {
        return ApiResponse.ok(events.get(eventId));
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<EventResponse> create(@Valid @RequestBody CreateEventRequest request) {
        return ApiResponse.ok(events.create(request));
    }

    @PutMapping("/events/{eventId}")
    public ApiResponse<EventResponse> update(@PathVariable UUID eventId, @Valid @RequestBody UpdateEventRequest request) {
        return ApiResponse.ok(events.update(eventId, request));
    }

    @PatchMapping("/events/{eventId}/status")
    public ApiResponse<EventResponse> updateStatus(
            @PathVariable UUID eventId, @Valid @RequestBody UpdateEventStatusRequest request) {
        return ApiResponse.ok(events.updateStatus(eventId, request));
    }

    @GetMapping("/events/{eventId}/my-role")
    public ApiResponse<EventRoleResponse> getMyRole(@PathVariable UUID eventId) {
        return ApiResponse.ok(events.getMyRole(eventId));
    }

    @GetMapping("/events/{eventId}/organizers")
    public ApiResponse<List<OrganizerResponse>> listOrganizers(@PathVariable UUID eventId) {
        return ApiResponse.ok(events.listOrganizers(eventId));
    }

    @PostMapping("/events/{eventId}/organizers")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrganizerResponse> assign(
            @PathVariable UUID eventId, @Valid @RequestBody AssignOrganizerRequest request) {
        return ApiResponse.ok(events.assign(eventId, request));
    }

    @DeleteMapping("/events/{eventId}/organizers/{memberId}")
    public ApiResponse<Void> removeOrganizer(@PathVariable UUID eventId, @PathVariable UUID memberId) {
        events.removeOrganizer(eventId, memberId);
        return ApiResponse.ok(null);
    }

    private static Pageable orderedPage(Pageable pageable, Set<String> allowedFields) {
        Sort sort = pageable.getSort();
        if (sort.stream().anyMatch(order -> !allowedFields.contains(order.getProperty()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Unsupported sort field");
        }
        if (sort.getOrderFor("id") == null) {
            sort = sort.and(Sort.by("id"));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }
}
