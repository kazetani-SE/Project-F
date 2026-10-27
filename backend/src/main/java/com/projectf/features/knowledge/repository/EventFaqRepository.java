package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventFaq;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventFaqRepository extends JpaRepository<EventFaq, UUID> {
    Page<EventFaq> findBySeriesId(UUID seriesId, Pageable pageable);
    Optional<EventFaq> findByIdAndSeriesId(UUID id, UUID seriesId);
}

