package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventFaq;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FaqRepository extends JpaRepository<EventFaq, UUID> {
    List<EventFaq> findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(UUID seriesId);

    List<EventFaq> findBySeriesIdAndCategoryOrderByIsPinnedDescUpdatedAtDesc(UUID seriesId, String category);
}
