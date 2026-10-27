package com.projectf.features.event.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SeriesDetailResponse(UUID id, String name, String description,
        Instant createdAt, List<EventResponse> events) { }
