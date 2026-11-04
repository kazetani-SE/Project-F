package com.projectf.features.document.dto.request;

import com.projectf.common.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DocumentApprovalRequest(
        @NotNull(message = "Trạng thái phê duyệt không được để trống")
        ApprovalStatus status,

        @NotNull(message = "Người phê duyệt không được để trống")
        UUID approvedBy,

        String rejectionReason
) {
}
