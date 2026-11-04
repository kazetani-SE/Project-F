package com.projectf.features.knowledge.dto.request;

import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record CreateIncidentRequest(
        UUID reportedBy,

        @NotBlank(message = "Tiêu đề sự cố không được để trống")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title,

        @NotNull(message = "Mức độ nghiêm trọng không được để trống")
        IncidentSeverity severity,

        @NotEmpty(message = "Cần chỉ định ít nhất 1 ban liên quan")
        List<Department> departments,

        @NotBlank(message = "Mô tả sự cố không được để trống")
        String description,

        @NotBlank(message = "Nguyên nhân cốt lõi không được để trống")
        String rootCause,

        @NotBlank(message = "Giải pháp tức thời không được để trống")
        String immediateSolution,

        @NotBlank(message = "Bài học kinh nghiệm không được để trống")
        String lessonLearned
) {
}
