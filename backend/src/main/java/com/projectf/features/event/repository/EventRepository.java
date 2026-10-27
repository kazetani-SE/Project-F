package com.projectf.features.event.repository;

import com.projectf.features.event.entity.Event;
import java.util.UUID;
import java.util.Optional;
import com.projectf.features.event.entity.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {
    Page<Event> findBySeriesId(UUID seriesId, Pageable pageable);
    Optional<Event> findFirstBySeriesIdAndIdNotAndStatusAndCreatedAtBeforeOrderByCreatedAtDesc(
            UUID seriesId, UUID id, EventStatus status, java.time.Instant createdAt);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id")
    Optional<Event> lockById(@Param("id") UUID id);
}

