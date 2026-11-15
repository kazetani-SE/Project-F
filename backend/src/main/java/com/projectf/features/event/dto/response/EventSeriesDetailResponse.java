package com.projectf.features.event.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EventSeriesDetailResponse(UUID id, String name, String description, OffsetDateTime createdAt,
                                        List<EventResponse> events) {}
