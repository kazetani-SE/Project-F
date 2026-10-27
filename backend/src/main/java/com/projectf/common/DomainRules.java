package com.projectf.common;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public final class DomainRules {
    private static final long MB = 1024L * 1024;
    private static final Set<String> RECEIPT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "application/pdf");
    private static final Set<String> FILE_CATEGORIES = Set.of(
            "RECEIPT", "DOCUMENT", "MEDIA", "FEEDBACK");

    private DomainRules() {
    }

    public static void eventDates(final LocalDate start, final LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) {
            throw new IllegalArgumentException("INVALID_EVENT_DATE_RANGE");
        }
    }

    public static void approveExpense(final int receiptCount, final BigDecimal fund,
            final BigDecimal approvedSpent, final BigDecimal amount) {
        if (receiptCount < 1) {
            throw new IllegalArgumentException("EXPENSE_RECEIPT_REQUIRED");
        }
        if (fund == null || approvedSpent == null || amount == null
                || approvedSpent.add(amount).compareTo(fund) > 0) {
            throw new IllegalArgumentException("BUDGET_OVER_ALLOCATED");
        }
    }

    public static void upload(final String category, final String mimeType, final long size) {
        if (!FILE_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        if (size <= 0 || size > ("RECEIPT".equals(category) ? 15 : 50) * MB) {
            throw new IllegalArgumentException("FILE_SIZE_EXCEEDED");
        }
        if ("RECEIPT".equals(category) && !RECEIPT_TYPES.contains(mimeType)) {
            throw new IllegalArgumentException("UNSUPPORTED_FILE_TYPE");
        }
    }
}
