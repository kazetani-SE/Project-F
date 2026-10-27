package com.projectf.features.event.controller;

import com.projectf.common.response.ApiResponse;
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
import com.projectf.features.event.service.EventService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class EventController {
    private final EventService service;
    public EventController(final EventService service) { this.service = service; }

    @GetMapping("/event-series")
    public ApiResponse<PageResponse<SeriesResponse>> series(
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int size) {
        return ApiResponse.ok(service.series(page, size));
    }

    @GetMapping("/event-series/{id}")
    public ApiResponse<SeriesDetailResponse> seriesDetail(@PathVariable final UUID id) {
        return ApiResponse.ok(service.seriesDetail(id));
    }

    @PostMapping("/event-series")
    public ResponseEntity<ApiResponse<SeriesResponse>> createSeries(
            @Valid @RequestBody final SeriesRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createSeries(request)));
    }

    @GetMapping("/events")
    public ApiResponse<PageResponse<EventResponse>> events(
            @RequestParam(required = false) final UUID seriesId,
            @RequestParam(required = false) final String status,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "10") final int size) {
        return ApiResponse.ok(service.events(seriesId, status, page, size));
    }

    @GetMapping("/events/{id}")
    public ApiResponse<EventResponse> event(@PathVariable final UUID id) {
        return ApiResponse.ok(service.event(id));
    }

    @PostMapping("/events")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(@Valid @RequestBody final EventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createEvent(request)));
    }

    @PutMapping("/events/{id}")
    public ApiResponse<EventResponse> updateEvent(@PathVariable final UUID id,
            @Valid @RequestBody final EventUpdateRequest request) {
        return ApiResponse.ok(service.updateEvent(id, request));
    }

    @PatchMapping("/events/{id}/status")
    public ApiResponse<EventResponse> status(@PathVariable final UUID id,
            @Valid @RequestBody final EventStatusRequest request) {
        return ApiResponse.ok(service.status(id, request));
    }

    @GetMapping("/events/{eventId}/organizers")
    public ApiResponse<List<OrganizerResponse>> organizers(@PathVariable final UUID eventId) {
        return ApiResponse.ok(service.organizers(eventId));
    }

    @PostMapping("/events/{eventId}/organizers")
    public ResponseEntity<ApiResponse<OrganizerResponse>> addOrganizer(
            @PathVariable final UUID eventId, @Valid @RequestBody final OrganizerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.addOrganizer(eventId, request)));
    }

    @DeleteMapping("/events/{eventId}/organizers/{memberId}")
    public ApiResponse<Void> removeOrganizer(@PathVariable final UUID eventId,
            @PathVariable final UUID memberId) {
        service.removeOrganizer(eventId, memberId);
        return ApiResponse.ok(null);
    }
}
