package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotNull;

public record PinRequest(@NotNull Boolean isPinned) { }
