package com.projectf.features.finance.dto.response;

import java.util.List;

public record BillScanResponse(
        String storeName,
        String billDate,
        Long totalAmount,
        List<Item> items) {

    public record Item(String name, Integer quantity, Long unitPrice, Long amount) {
    }
}