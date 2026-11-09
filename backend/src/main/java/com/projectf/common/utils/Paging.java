package com.projectf.common.utils;

import com.projectf.common.exception.ApiException;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

public final class Paging {
    private Paging() {
    }

    public static Pageable withStableSort(Pageable pageable, Set<String> allowedFields, Map<String, String> aliases) {
        Sort sort = Sort.by(pageable.getSort().stream()
                .map(order -> order.withProperty(aliases.getOrDefault(order.getProperty(), order.getProperty())))
                .toList());
        if (sort.stream().anyMatch(order -> !allowedFields.contains(order.getProperty()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Unsupported sort field");
        }
        if (sort.getOrderFor("id") == null) {
            sort = sort.and(Sort.by("id"));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }
}
