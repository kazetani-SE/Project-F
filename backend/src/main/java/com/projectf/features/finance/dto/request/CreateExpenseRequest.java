package com.projectf.features.finance.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateExpenseRequest(
        UUID budgetItemId,

        @NotBlank(message = "Tên khoản chi không được để trống") @Size(max = 200, message = "Tên khoản chi tối đa 200 ký tự") String itemName,

        @NotNull(message = "Số lượng là bắt buộc") @Positive(message = "Số lượng phải lớn hơn 0") BigDecimal quantity,

        @NotNull(message = "Đơn giá thực tế là bắt buộc") @PositiveOrZero(message = "Đơn giá thực tế phải lớn hơn hoặc bằng 0") BigDecimal actualUnitPrice,

        @NotNull(message = "Người chi trả là bắt buộc") UUID paidBy,

        @NotNull(message = "Ngày thanh toán là bắt buộc") LocalDate paymentDate,

        String notes,

        @Valid List<CreateReceiptRequest> receipts) {
}
