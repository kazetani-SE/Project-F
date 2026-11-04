package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFaqRequest(
        @NotBlank(message = "Câu hỏi không được để trống")
        String question,

        @NotBlank(message = "Câu trả lời không được để trống")
        String answer,

        @NotBlank(message = "Danh mục không được để trống")
        @Size(max = 50, message = "Danh mục tối đa 50 ký tự")
        String category,

        Boolean isPinned
) {
}
