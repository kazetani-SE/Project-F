package com.projectf.common.response;
import java.util.List;
import org.springframework.data.domain.Page;
public record PageResponse<T>(List<T> content,int page,int size,long totalElements,int totalPages) {
 public static <T> PageResponse<T> from(final Page<T> source) {
  return new PageResponse<>(source.getContent(),source.getNumber(),source.getSize(),
   source.getTotalElements(),source.getTotalPages());
 }
}
