package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record CreateFeedbackRequest(
        @NotBlank(message = "Nguồn đánh giá không được để trống")
        @Size(max = 50, message = "Nguồn đánh giá tối đa 50 ký tự")
        String sourceType,

        @NotBlank(message = "Đường dẫn tệp đính kèm không được để trống")
        String fileUrl,

        @NotNull(message = "Điểm đánh giá không được để trống")
        @Min(value = 1, message = "Điểm đánh giá tối thiểu là 1")
        @Max(value = 5, message = "Điểm đánh giá tối đa là 5")
        Integer ratingScore,

        String highlightContent,

        String improveContent,

        Map<String, Object> customResponses
) {
}
