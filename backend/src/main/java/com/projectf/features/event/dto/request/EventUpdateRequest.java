package com.projectf.features.event.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EventUpdateRequest(UUID seriesId, String seasonName, String title,
        String description, LocalDate expectedStartDate, LocalDate expectedEndDate,
        LocalDate actualStartDate, LocalDate actualEndDate,
        @PositiveOrZero BigDecimal allocatedFund) { }
