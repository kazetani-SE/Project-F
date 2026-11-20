package com.projectf.features.finance.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BillScanResponse(
        String storeName,
        String billDate, // yyyy-MM-dd hoặc null
        String receiptCode,
        String itemName, // dòng hàng ĐẦU TIÊN
        Integer quantity,
        Long unitPrice,
        Long totalAmount,
        String notes) { // tổng tiền cả hóa đơn
}