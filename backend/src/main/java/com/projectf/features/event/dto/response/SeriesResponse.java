package com.projectf.features.event.dto.response;

import java.time.Instant;
import java.util.UUID;

public record SeriesResponse(UUID id, String name, String description,
        Instant createdAt) { }
