package com.projectf.features.event.repository;

import com.projectf.features.event.entity.EventOrganizer;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventOrganizerRepository extends JpaRepository<EventOrganizer, UUID> {
    Optional<EventOrganizer> findByEventIdAndMemberId(UUID eventId, UUID memberId);
    List<EventOrganizer> findByEventIdOrderByJoinedAtDesc(UUID eventId);
}

