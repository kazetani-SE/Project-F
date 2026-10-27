package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MediaRequest(@NotBlank @Pattern(regexp = "POSTER|BANNER|STANDEE|BACKDROP|BADGE|TRAILER|SOCIAL_POST|OTHER") String assetType,
        @NotBlank String title,
        String specifications, String designFileUrl, String previewImageUrl) { }
