package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotNull;

public record PrintStatusRequest(@NotNull Boolean isPrinted) { }
