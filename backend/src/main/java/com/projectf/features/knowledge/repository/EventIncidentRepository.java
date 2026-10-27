package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventIncident;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventIncidentRepository extends JpaRepository<EventIncident, UUID> {
    Page<EventIncident> findByEventId(UUID eventId, Pageable pageable);
}

