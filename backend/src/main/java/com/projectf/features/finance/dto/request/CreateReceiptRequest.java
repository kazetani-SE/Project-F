package com.projectf.features.finance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReceiptRequest(
    @Size(max = 100, message = "Mã hóa đơn tối đa 100 ký tự")
    String receiptCode,

    @NotBlank(message = "Đường dẫn ảnh/file hóa đơn không được để trống")
    String imageUrl,

    @Size(max = 200, message = "Tên nhà cung cấp tối đa 200 ký tự")
    String supplierName
) {}

