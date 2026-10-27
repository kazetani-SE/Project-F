package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventDocument;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventDocumentRepository extends JpaRepository<EventDocument, UUID> {
    Page<EventDocument> findByEventId(UUID eventId, Pageable pageable);
    Optional<EventDocument> findByIdAndEventId(UUID id, UUID eventId);
}

