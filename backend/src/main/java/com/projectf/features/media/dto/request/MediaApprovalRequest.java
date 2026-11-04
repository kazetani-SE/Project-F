package com.projectf.features.media.dto.request;

import com.projectf.common.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record MediaApprovalRequest(
        @NotNull(message = "Trạng thái phê duyệt không được để trống")
        ApprovalStatus approvalStatus,

        @NotNull(message = "Người phê duyệt không được để trống")
        UUID approvedBy
) {
}
