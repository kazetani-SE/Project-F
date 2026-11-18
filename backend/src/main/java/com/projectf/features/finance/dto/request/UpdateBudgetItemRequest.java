package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateBudgetItemRequest(
        @NotNull(message = "Danh mục kinh phí là bắt buộc") UUID categoryId,

        UUID benchmarkId,

        UUID mediaAsset,

        @NotBlank(message = "Tên hạng mục dự trù không được để trống") @Size(max = 200, message = "Tên hạng mục tối đa 200 ký tự") String itemName,

        @NotNull(message = "Số lượng là bắt buộc") @Positive(message = "Số lượng phải lớn hơn 0") BigDecimal quantity,

        @NotBlank(message = "Đơn vị tính không được để trống") @Size(max = 30, message = "Đơn vị tính tối đa 30 ký tự") String unit,

        @NotNull(message = "Đơn giá dự kiến là bắt buộc") @PositiveOrZero(message = "Đơn giá dự kiến phải lớn hơn hoặc bằng 0") BigDecimal estUnitPrice,

        String notes,

        @Size(max = 200, message = "Tên nhà cung cấp tối đa 200 ký tự") String supplierName,

        @URL(message = "Đường dẫn nhà cung cấp không hợp lệ") String supplierLink) {

    public UpdateBudgetItemRequest(
            UUID categoryId,
            UUID benchmarkId,
            UUID mediaAsset,
            String itemName,
            BigDecimal quantity,
            String unit,
            BigDecimal estUnitPrice,
            String notes) {
        this(categoryId, benchmarkId, mediaAsset, itemName, quantity, unit, estUnitPrice, notes, null, null);
    }
}
