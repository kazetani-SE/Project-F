package com.projectf.features.media.repository;

import com.projectf.features.media.entity.EventMediaAsset;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaAssetRepository extends JpaRepository<EventMediaAsset, UUID> {
    List<EventMediaAsset> findByEventIdOrderByCreatedAtDesc(UUID eventId);

    List<EventMediaAsset> findByEventIdAndAssetTypeOrderByCreatedAtDesc(UUID eventId, String assetType);
}
