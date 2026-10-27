package com.projectf.features.event.repository;

import com.projectf.features.event.entity.EventSeries;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventSeriesRepository extends JpaRepository<EventSeries, UUID> {
}

