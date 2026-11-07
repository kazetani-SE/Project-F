package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventIncident;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IncidentRepository extends JpaRepository<EventIncident, UUID> {
    List<EventIncident> findByEventIdOrderByCreatedAtDesc(UUID eventId);
}
