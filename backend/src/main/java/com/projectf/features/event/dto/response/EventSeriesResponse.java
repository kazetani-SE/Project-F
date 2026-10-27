package com.projectf.features.event.dto.response;
import java.time.OffsetDateTime;
import java.util.UUID;
public record EventSeriesResponse(UUID id,String name,String description,OffsetDateTime createdAt) {}
