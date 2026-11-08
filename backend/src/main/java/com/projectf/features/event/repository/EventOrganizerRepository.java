package com.projectf.features.event.repository;
import com.projectf.features.event.entity.EventOrganizer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
public interface EventOrganizerRepository extends JpaRepository<EventOrganizer,UUID> {
 @Query("""
     select (count(organizer) > 0) from EventOrganizer organizer, Event event
     where organizer.eventId = event.id and event.seriesId = :seriesId and organizer.memberId = :memberId
     """)
 boolean hasAssignmentInSeries(UUID seriesId, UUID memberId);
 List<EventOrganizer> findByEventIdOrderByJoinedAtAscIdAsc(UUID eventId);
 boolean existsByEventIdAndMemberId(UUID eventId, UUID memberId);
 Optional<EventOrganizer> findByEventIdAndMemberId(UUID eventId, UUID memberId);

 @Modifying
 @Query("delete from EventOrganizer organizer where organizer.eventId = :eventId and organizer.memberId = :memberId")
 int deleteByEventIdAndMemberId(UUID eventId, UUID memberId);
}
