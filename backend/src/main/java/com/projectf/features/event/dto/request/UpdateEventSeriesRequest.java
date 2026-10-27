package com.projectf.features.event.dto.request;
import jakarta.validation.constraints.*;
public record UpdateEventSeriesRequest(@NotBlank @Size(max=200) String name,String description) {}
