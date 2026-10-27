package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventFeedback;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventFeedbackRepository extends JpaRepository<EventFeedback, UUID> {
    Page<EventFeedback> findByEventId(UUID eventId, Pageable pageable);
    long countByEventId(UUID eventId);
    @Query("select avg(f.ratingScore) from EventFeedback f where f.event.id = :eventId")
    Double averageRating(@Param("eventId") UUID eventId);
}

