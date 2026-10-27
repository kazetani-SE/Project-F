package com.projectf.features.knowledge.repository;

import com.projectf.features.knowledge.entity.EventMediaAsset;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventMediaAssetRepository extends JpaRepository<EventMediaAsset, UUID> {
    Page<EventMediaAsset> findByEventId(UUID eventId, Pageable pageable);
    Optional<EventMediaAsset> findByIdAndEventId(UUID id, UUID eventId);
}

