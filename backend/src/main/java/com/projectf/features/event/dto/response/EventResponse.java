package com.projectf.features.event.dto.response;

import com.projectf.features.event.entity.EventStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EventResponse(UUID id, UUID seriesId, String seasonName, String title,
        String description, LocalDate expectedStartDate, LocalDate expectedEndDate,
        LocalDate actualStartDate, LocalDate actualEndDate, EventStatus status,
        BigDecimal allocatedFund, Instant createdAt, Instant updatedAt) { }
