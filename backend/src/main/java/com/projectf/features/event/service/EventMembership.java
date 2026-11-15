package com.projectf.features.event.service;

import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.event.entity.EventRole;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class EventMembership {
    private final EventOrganizerRepository organizers;

    public EventMembership(EventOrganizerRepository organizers) {
        this.organizers = organizers;
    }

    public boolean hasAssignment(UUID eventId, UUID memberId) {
        return organizers.existsByEventIdAndMemberId(eventId, memberId);
    }

    public boolean hasRole(UUID eventId, UUID memberId, EventRole role) {
        return organizers.findByEventIdAndMemberId(eventId, memberId)
                .map(organizer -> organizer.getRole() == role).orElse(false);
    }
}
