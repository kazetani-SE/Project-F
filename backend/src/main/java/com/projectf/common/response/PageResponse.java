package com.projectf.common.response;

import java.util.List;

public record PageResponse<T>(List<T> items, int pageNumber, int pageSize,
        long totalElements, long totalPages, boolean isFirst, boolean isLast, boolean hasNext) {
    public static <T> PageResponse<T> of(final List<T> items, final int page, final int size,
            final long count) {
        final long pages = (count + size - 1) / size;
        return new PageResponse<>(items, page, size, count, pages, page == 0,
                page + 1 >= pages, page + 1 < pages);
    }
}
