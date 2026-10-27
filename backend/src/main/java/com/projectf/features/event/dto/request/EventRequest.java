package com.projectf.features.event.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EventRequest(UUID seriesId, @NotBlank String seasonName, @NotBlank String title,
        String description, @NotNull LocalDate expectedStartDate,
        @NotNull LocalDate expectedEndDate, @PositiveOrZero BigDecimal allocatedFund,
        LocalDate actualStartDate, LocalDate actualEndDate) { }
