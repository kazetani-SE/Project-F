package com.projectf.common.exception.finance;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Báo các danh mục đã soft delete. Message CHỈ gồm các UUID nối bằng dấu phẩy
 * (không kèm chữ nào khác) để FE nhận biết. Kế thừa IllegalArgumentException
 * nên GlobalExceptionHandler hiện tại tự trả 400 với message này.
 */
public class DeletedCategoriesException extends IllegalArgumentException {
  private static final long serialVersionUID = 1L;
  private final List<UUID> categoryIds;

  public DeletedCategoriesException(List<UUID> categoryIds) {
    super(categoryIds.stream().map(UUID::toString).collect(Collectors.joining(",")));
    this.categoryIds = categoryIds;
  }

  public List<UUID> getCategoryIds() {
    return categoryIds;
  }
}