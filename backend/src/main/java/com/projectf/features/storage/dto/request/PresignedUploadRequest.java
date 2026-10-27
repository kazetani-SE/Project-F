package com.projectf.features.storage.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PresignedUploadRequest(@NotBlank String category, @NotBlank String fileName,
        @NotBlank String mimeType, @NotNull @Positive Long fileSize) { }
