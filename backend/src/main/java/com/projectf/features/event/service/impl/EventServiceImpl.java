package com.projectf.features.event.service.impl;

import com.projectf.common.DomainRules;
import com.projectf.common.response.PageResponse;
import com.projectf.common.security.AccessService;
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
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventSeries;
import com.projectf.features.event.entity.EventStatus;
import com.projectf.features.event.mapper.EventMapper;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.event.repository.EventSeriesRepository;
import com.projectf.features.event.service.EventService;
import com.projectf.features.member.service.MemberService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class EventServiceImpl implements EventService {
    private static final EnumMap<EventStatus, Set<EventStatus>> TRANSITIONS = new EnumMap<>(EventStatus.class);
    static {
        TRANSITIONS.put(EventStatus.PLANNING, Set.of(EventStatus.APPROVED, EventStatus.CANCELLED));
        TRANSITIONS.put(EventStatus.APPROVED, Set.of(EventStatus.IN_PROGRESS, EventStatus.CANCELLED));
        TRANSITIONS.put(EventStatus.IN_PROGRESS, Set.of(EventStatus.COMPLETED, EventStatus.CANCELLED));
    }

    private final EventSeriesRepository seriesRepository;
    private final EventRepository eventRepository;
    private final EventOrganizerRepository organizerRepository;
    private final MemberService members;
    private final EventMapper mapper;
    private final AccessService access;
    private final EntityManager entityManager;

    public EventServiceImpl(final EventSeriesRepository seriesRepository,
            final EventRepository events, final EventOrganizerRepository organizers,
            final MemberService members, final EventMapper mapper, final AccessService access,
            final EntityManager entityManager) {
        this.seriesRepository = seriesRepository;
        this.eventRepository = events;
        this.organizerRepository = organizers;
        this.members = members;
        this.mapper = mapper;
        this.access = access;
        this.entityManager = entityManager;
    }

    @Override
    public PageResponse<SeriesResponse> series(final int page, final int size) {
        final var result = seriesRepository.findAll(paging(page, size, "createdAt"));
        return PageResponse.of(result.map(mapper::toResponse).getContent(), page, size, result.getTotalElements());
    }

    @Override
    public SeriesDetailResponse seriesDetail(final UUID id) {
        final EventSeries series = requireSeries(id);
        final var seasons = eventRepository.findBySeriesId(id, paging(0, 100, "createdAt"));
        return new SeriesDetailResponse(series.getId(), series.getName(), series.getDescription(),
                series.getCreatedAt(), seasons.map(mapper::toResponse).getContent());
    }

    @Override
    @Transactional
    public SeriesResponse createSeries(final SeriesRequest request) {
        access.requireClubAdmin();
        final EventSeries series = mapper.createSeries(request);
        seriesRepository.saveAndFlush(series);
        entityManager.refresh(series);
        return mapper.toResponse(series);
    }

    @Override
    public PageResponse<EventResponse> events(final UUID seriesId, final String status,
            final int page, final int size) {
        EventStatus parsed = null;
        if (status != null && !status.isBlank()) {
            try { parsed = EventStatus.valueOf(status); }
            catch (IllegalArgumentException error) { throw new IllegalArgumentException("VALIDATION_FAILED", error); }
        }
        final EventStatus selected = parsed;
        final Specification<Event> filter = (root, query, cb) -> cb.and(
                seriesId == null ? cb.conjunction() : cb.equal(root.get("series").get("id"), seriesId),
                selected == null ? cb.conjunction() : cb.equal(root.get("status"), selected));
        final var result = eventRepository.findAll(filter, paging(page, size, "createdAt"));
        return PageResponse.of(result.map(mapper::toResponse).getContent(), page, size, result.getTotalElements());
    }

    @Override
    public EventResponse event(final UUID id) { return mapper.toResponse(requireEvent(id)); }

    @Override
    @Transactional
    public EventResponse createEvent(final EventRequest request) {
        access.requireClubAdmin();
        DomainRules.eventDates(request.expectedStartDate(), request.expectedEndDate());
        final EventSeries series = request.seriesId() == null ? null : requireSeries(request.seriesId());
        final Event event = mapper.createEvent(request, series);
        eventRepository.saveAndFlush(event);
        entityManager.refresh(event);
        return mapper.toResponse(event);
    }

    @Override
    @Transactional
    public EventResponse updateEvent(final UUID id, final EventUpdateRequest request) {
        access.requireEventLead(id);
        final Event event = requireEvent(id);
        final EventSeries series = request.seriesId() == null ? null : requireSeries(request.seriesId());
        final LocalDate start = request.expectedStartDate() == null ? event.getExpectedStartDate() : request.expectedStartDate();
        final LocalDate end = request.expectedEndDate() == null ? event.getExpectedEndDate() : request.expectedEndDate();
        DomainRules.eventDates(start, end);
        mapper.updateEvent(event, request, series);
        event.setUpdatedAt(Instant.now());
        return mapper.toResponse(eventRepository.saveAndFlush(event));
    }

    @Override
    @Transactional
    public EventResponse status(final UUID id, final EventStatusRequest request) {
        access.requireEventLead(id);
        final Event event = requireEvent(id);
        if (!TRANSITIONS.getOrDefault(event.getStatus(), Set.of()).contains(request.status())) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        event.setStatus(request.status());
        if (request.actualStartDate() != null) event.setActualStartDate(request.actualStartDate());
        if (request.actualEndDate() != null) event.setActualEndDate(request.actualEndDate());
        if (event.getActualStartDate() != null && event.getActualEndDate() != null) {
            DomainRules.eventDates(event.getActualStartDate(), event.getActualEndDate());
        }
        event.setUpdatedAt(Instant.now());
        return mapper.toResponse(eventRepository.saveAndFlush(event));
    }

    @Override
    public List<OrganizerResponse> organizers(final UUID eventId) {
        requireEvent(eventId);
        return organizerRepository.findByEventIdOrderByJoinedAtDesc(eventId).stream()
                .map(mapper::toResponse).toList();
    }

    @Override
    @Transactional
    public OrganizerResponse addOrganizer(final UUID eventId, final OrganizerRequest request) {
        access.requireEventLead(eventId);
        final Event event = requireEvent(eventId);
        final var member = members.requireActive(request.memberId());
        if (organizerRepository.findByEventIdAndMemberId(eventId, member.getId()).isPresent()) {
            throw new IllegalArgumentException("DUPLICATE_RESOURCE");
        }
        final EventOrganizer organizer = mapper.createOrganizer(event, member, request);
        organizerRepository.saveAndFlush(organizer);
        entityManager.refresh(organizer);
        return mapper.toResponse(organizer);
    }

    @Override
    @Transactional
    public void removeOrganizer(final UUID eventId, final UUID memberId) {
        access.requireEventLead(eventId);
        final EventOrganizer organizer = organizerRepository.findByEventIdAndMemberId(eventId, memberId)
                .orElseThrow(() -> new NoSuchElementException("organizer"));
        organizerRepository.delete(organizer);
    }

    @Override
    public Event requireEvent(final UUID id) {
        return eventRepository.findById(id).orElseThrow(() -> new NoSuchElementException("events"));
    }

    @Override
    public EventSeries requireSeries(final UUID id) {
        return seriesRepository.findById(id).orElseThrow(() -> new NoSuchElementException("event_series"));
    }

    @Override
    @Transactional
    public Event lockEvent(final UUID id) {
        return eventRepository.lockById(id).orElseThrow(() -> new NoSuchElementException("events"));
    }

    @Override
    public UUID previousCompletedEvent(final UUID id) {
        final Event current = requireEvent(id);
        if (current.getSeries() == null) return null;
        return eventRepository.findFirstBySeriesIdAndIdNotAndStatusAndCreatedAtBeforeOrderByCreatedAtDesc(
                current.getSeries().getId(), id, EventStatus.COMPLETED, current.getCreatedAt())
                .map(Event::getId).orElse(null);
    }

    private PageRequest paging(final int page, final int size, final String sort) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("VALIDATION_FAILED");
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sort));
    }
}
