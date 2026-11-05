package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateBenchmarkRequest(
    @NotNull(message = "Danh mục kinh phí là bắt buộc")
    UUID categoryId,

    @NotBlank(message = "Tên hạng mục vật tư không được để trống")
    @Size(max = 200, message = "Tên hạng mục tối đa 200 ký tự")
    String itemName,

    @NotBlank(message = "Đơn vị tính không được để trống")
    @Size(max = 30, message = "Đơn vị tính tối đa 30 ký tự")
    String unit,

    @NotNull(message = "Đơn giá thị trường hiện tại là bắt buộc")
    @PositiveOrZero(message = "Đơn giá thị trường phải lớn hơn hoặc bằng 0")
    BigDecimal curMarketPrice,

    @Size(max = 200, message = "Tham chiếu nhà cung cấp tối đa 200 ký tự")
    String supplierReference
) {}