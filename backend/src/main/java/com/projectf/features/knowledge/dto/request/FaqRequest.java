package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;

public record FaqRequest(@NotBlank String question, @NotBlank String answer,
        @NotBlank String category, Boolean isPinned) { }
