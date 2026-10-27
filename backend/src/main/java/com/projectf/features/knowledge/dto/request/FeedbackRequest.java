package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.Map;

public record FeedbackRequest(@NotBlank @Pattern(regexp = "ATTENDEE|ORGANIZER|SPONSOR|SPEAKER") String sourceType,
        @NotBlank String fileUrl,
        @NotNull @Min(1) @Max(5) Integer ratingScore, String highlightContent,
        String improvementContent, Map<String, Object> customResponses) { }
