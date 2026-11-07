package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventFeedback;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<EventFeedback, UUID> {
    List<EventFeedback> findByEventIdOrderBySubmittedAtDesc(UUID eventId);
}
