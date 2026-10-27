package com.projectf.features.event.dto.request;

import com.projectf.features.event.entity.EventStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record EventStatusRequest(@NotNull EventStatus status,
        LocalDate actualStartDate, LocalDate actualEndDate) { }
