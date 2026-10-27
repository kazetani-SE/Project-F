package com.projectf.features.event.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record CreateEventRequest(UUID seriesId,@NotBlank @Size(max=50) String seasonName,
 @NotBlank @Size(max=255) String title,String description,
 @NotNull LocalDate expectedStartDate,@NotNull LocalDate expectedEndDate,
 @PositiveOrZero BigDecimal allocatedFund) {}
