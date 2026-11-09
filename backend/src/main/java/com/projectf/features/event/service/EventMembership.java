package com.projectf.features.event.service;

import com.projectf.features.event.repository.EventOrganizerRepository;
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
}
