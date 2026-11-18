package com.projectf.common.response;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageResponse<T>(List<T> items, int pageNumber, int pageSize, long totalElements, int totalPages,
                              boolean isFirst, boolean isLast, boolean hasNext) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages(), page.isFirst(), page.isLast(), page.hasNext());
    }
}
