package com.projectf.features.event.service.impl;

import com.projectf.common.exception.ApiException;
import com.projectf.common.security.AccessPolicy;
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
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventSeries;
import com.projectf.features.event.entity.EventStatus;
import com.projectf.features.event.mapper.EventMapper;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.event.repository.EventSeriesRepository;
import com.projectf.features.event.service.EventService;
import com.projectf.features.member.dto.response.MemberResponse;
import com.projectf.features.member.service.MemberService;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class EventServiceImpl implements EventService {
    private static final Sort SEASON_ORDER = Sort.by(Sort.Order.desc("expectedStartDate"), Sort.Order.asc("id"));

    private final EventRepository events;
    private final EventSeriesRepository series;
    private final EventOrganizerRepository organizers;
    private final MemberService members;
    private final EventMapper mapper;
    private final AccessPolicy access;

    public EventServiceImpl(EventRepository events, EventSeriesRepository series, EventOrganizerRepository organizers,
                            MemberService members, EventMapper mapper, AccessPolicy access) {
        this.events = events;
        this.series = series;
        this.organizers = organizers;
        this.members = members;
        this.mapper = mapper;
        this.access = access;
    }

    @Override
    @Transactional
    public EventSeriesResponse createSeries(CreateEventSeriesRequest request) {
        return mapper.toResponse(series.saveAndFlush(mapper.toEntity(request)));
    }

    @Override
    public EventSeriesDetailResponse getSeries(UUID seriesId, EventStatus status) {
        EventSeries eventSeries = findSeries(seriesId);
        List<EventResponse> seasons = events.findAll(eventFilter(seriesId, status), SEASON_ORDER).stream()
                .map(mapper::toResponse).toList();
        return new EventSeriesDetailResponse(eventSeries.getId(), eventSeries.getName(), eventSeries.getDescription(),
                eventSeries.getCreatedAt(), seasons);
    }

    @Override
    public Page<EventSeriesResponse> listSeries(Pageable pageable) {
        return series.findAll(pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional
    public EventSeriesResponse updateSeries(UUID seriesId, UpdateEventSeriesRequest request) {
        EventSeries eventSeries = findSeries(seriesId);
        mapper.updateSeries(eventSeries, request);
        return mapper.toResponse(series.saveAndFlush(eventSeries));
    }

    @Override
    @Transactional
    public EventResponse create(CreateEventRequest request) {
        requireSeriesIfPresent(request.seriesId());
        return mapper.toResponse(events.saveAndFlush(mapper.toEntity(request)));
    }

    @Override
    public EventResponse get(UUID eventId) {
        access.requireEvent(eventId);
        return mapper.toResponse(events.findById(eventId).orElseThrow(EventServiceImpl::eventNotFound));
    }

    @Override
    public Page<EventResponse> list(UUID seriesId, EventStatus status, Pageable pageable) {
        return events.findAll(eventFilter(seriesId, status), pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional
    public EventResponse update(UUID eventId, UpdateEventRequest request) {
        Event event = findEventForUpdate(eventId);
        if (request.status() != null && request.status() != event.getStatus()) {
            throw invalidTransition();
        }
        requireSeriesIfPresent(request.seriesId());
        if (request.actualStartDate() != null || request.actualEndDate() != null) {
            updateActualDates(event, event.getStatus(), request.actualStartDate(), request.actualEndDate());
        }
        mapper.update(event, request);
        return mapper.toResponse(events.saveAndFlush(event));
    }

    @Override
    @Transactional
    public EventResponse updateStatus(UUID eventId, UpdateEventStatusRequest request) {
        // API §3.2: khóa bản ghi để hai yêu cầu không thể chuyển trạng thái từ cùng một trạng thái cũ.
        Event event = findEventForUpdate(eventId);
        EventStatus next = request.status();
        boolean allowed = switch (event.getStatus()) {
            case PLANNING -> next == EventStatus.APPROVED || next == EventStatus.CANCELLED;
            case APPROVED -> next == EventStatus.IN_PROGRESS || next == EventStatus.CANCELLED;
            case IN_PROGRESS -> next == EventStatus.COMPLETED || next == EventStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
        if (!allowed) {
            throw invalidTransition();
        }
        if (next == EventStatus.IN_PROGRESS && request.actualStartDate() == null) {
            throw invalidDates("An actual start date is required");
        }
        if (next == EventStatus.COMPLETED && request.actualEndDate() == null) {
            throw invalidDates("An actual end date is required");
        }
        updateActualDates(event, next, request.actualStartDate(), request.actualEndDate());
        event.setStatus(next);
        return mapper.toResponse(events.saveAndFlush(event));
    }

    @Override
    public EventRoleResponse getMyRole(UUID eventId) {
        access.requireEvent(eventId);
        requireEventExists(eventId);
        UUID memberId = access.currentMemberId();
        return new EventRoleResponse(organizers.findByEventIdAndMemberId(eventId, memberId)
                .map(EventOrganizer::getRole).orElse(null));
    }

    @Override
    @Transactional
    public OrganizerResponse assign(UUID eventId, AssignOrganizerRequest request) {
        requireEventExists(eventId);
        MemberResponse member = members.requireActiveForAssignment(request.memberId());
        if (organizers.existsByEventIdAndMemberId(eventId, request.memberId())) {
            throw duplicateOrganizer(null);
        }
        try {
            return mapper.toResponse(organizers.saveAndFlush(mapper.toEntity(eventId, request)), member.fullName());
        } catch (DataIntegrityViolationException exception) {
            throw duplicateOrganizer(exception);
        }
    }

    @Override
    public List<OrganizerResponse> listOrganizers(UUID eventId) {
        access.requireEvent(eventId);
        requireEventExists(eventId);
        List<EventOrganizer> assignments = organizers.findByEventIdOrderByJoinedAtAscIdAsc(eventId);
        Map<UUID, String> names = members.findNames(assignments.stream().map(EventOrganizer::getMemberId).toList());
        return assignments.stream().map(organizer -> mapper.toResponse(organizer, names.get(organizer.getMemberId())))
                .toList();
    }

    @Override
    @Transactional
    public void removeOrganizer(UUID eventId, UUID memberId) {
        requireEventExists(eventId);
        if (organizers.deleteByEventIdAndMemberId(eventId, memberId) == 0) {
            throw resourceNotFound("Organizer not found");
        }
    }

    private Specification<Event> eventFilter(UUID seriesId, EventStatus status) {
        // Lọc mùa theo phân công ngay trong truy vấn để tổng số bản ghi và phân trang cùng phạm vi.
        UUID memberId = access.isAdmin() ? null : access.currentMemberId();
        return (event, query, criteria) -> {
            List<Predicate> filters = new ArrayList<>();
            if (seriesId != null) {
                filters.add(criteria.equal(event.get("seriesId"), seriesId));
            }
            if (status != null) {
                filters.add(criteria.equal(event.get("status"), status));
            }
            if (memberId != null) {
                Subquery<Integer> assignment = query.subquery(Integer.class);
                Root<EventOrganizer> organizer = assignment.from(EventOrganizer.class);
                assignment.select(criteria.literal(1)).where(
                        criteria.equal(organizer.get("eventId"), event.get("id")),
                        criteria.equal(organizer.get("memberId"), memberId));
                filters.add(criteria.exists(assignment));
            }
            return criteria.and(filters.toArray(Predicate[]::new));
        };
    }

    private static void updateActualDates(Event event, EventStatus status, LocalDate start, LocalDate end) {
        LocalDate actualStart = start == null ? event.getActualStartDate() : start;
        if ((status == EventStatus.IN_PROGRESS || status == EventStatus.COMPLETED) && actualStart == null) {
            throw invalidDates("An actual start date is required");
        }
        LocalDate actualEnd = end == null ? event.getActualEndDate() : end;
        if (status == EventStatus.COMPLETED && actualEnd == null) {
            throw invalidDates("An actual end date is required");
        }
        if (actualEnd != null && (actualStart == null || actualEnd.isBefore(actualStart))) {
            throw invalidDates("Actual end date must be on or after the actual start date");
        }
        event.setActualStartDate(actualStart);
        event.setActualEndDate(actualEnd);
    }

    private EventSeries findSeries(UUID seriesId) {
        return series.findById(seriesId).orElseThrow(EventServiceImpl::seriesNotFound);
    }

    private void requireSeriesIfPresent(UUID seriesId) {
        if (seriesId != null && !series.existsById(seriesId)) {
            throw seriesNotFound();
        }
    }

    private void requireEventExists(UUID eventId) {
        if (!events.existsById(eventId)) {
            throw eventNotFound();
        }
    }

    private Event findEventForUpdate(UUID eventId) {
        return events.findByIdForUpdate(eventId).orElseThrow(EventServiceImpl::eventNotFound);
    }

    private static ApiException invalidTransition() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION", "Invalid event status transition");
    }

    private static ApiException invalidDates(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT_DATE_RANGE", message);
    }

    private static ApiException duplicateOrganizer(Throwable cause) {
        return new ApiException(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "Member is already an event organizer", cause);
    }

    private static ApiException seriesNotFound() {
        return resourceNotFound("Event series not found");
    }

    private static ApiException eventNotFound() {
        return resourceNotFound("Event not found");
    }

    private static ApiException resourceNotFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
    }
}
