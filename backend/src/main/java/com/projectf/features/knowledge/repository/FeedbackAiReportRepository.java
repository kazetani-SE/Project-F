package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventFeedbackAiReport;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackAiReportRepository extends JpaRepository<EventFeedbackAiReport, UUID> {
    Optional<EventFeedbackAiReport> findByEventId(UUID eventId);
}
