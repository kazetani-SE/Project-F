package com.projectf.features.event.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SeriesRequest(@NotBlank String name, String description) { }
