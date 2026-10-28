package com.projectf.features.event.repository;
import com.projectf.features.event.entity.EventOrganizer;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
public interface EventOrganizerRepository extends JpaRepository<EventOrganizer,UUID> {
 Page<EventOrganizer> findByEventId(UUID eventId,Pageable pageable);
 boolean existsByEventIdAndMemberId(UUID eventId,UUID memberId);
 void deleteByEventIdAndMemberId(UUID eventId,UUID memberId);
}
