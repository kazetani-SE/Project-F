package com.projectf.features.finance.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpenseRequest(UUID budgetItemId, @NotBlank String itemName,
        @NotNull @Positive BigDecimal quantity,
        @NotNull @PositiveOrZero BigDecimal actualUnitPrice,
        @NotNull LocalDate paymentDate, String notes,
        List<@Valid ReceiptRequest> receipts) { }
