package com.projectf.features.knowledge.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record KnowledgeChatRequest(
        UUID seriesId,
        @NotBlank(message = "Nội dung câu hỏi không được để trống")
        @Size(max = 1500, message = "Câu hỏi tối đa 1500 ký tự")
        String message,
        List<ChatTurnItem> history
) {
    public record ChatTurnItem(
            String role,
            String content
    ) {
    }
}
