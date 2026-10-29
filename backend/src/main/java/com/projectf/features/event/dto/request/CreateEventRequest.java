package com.projectf.features.event.dto.request;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record CreateEventRequest(UUID seriesId,@NotBlank @Size(max=50) String seasonName,
 @NotBlank @Size(max=255) String title,String description,
 @NotNull LocalDate expectedStartDate,@NotNull LocalDate expectedEndDate,
 @PositiveOrZero BigDecimal allocatedFund) {
 /** @NotNull báo lỗi thiếu ngày; kiểm tra này báo lỗi khi thứ tự ngày sai. */
 @AssertTrue(message="expectedEndDate phải lớn hơn hoặc bằng expectedStartDate")
 public boolean isExpectedDateRangeValid() {
  return expectedStartDate == null || expectedEndDate == null || !expectedEndDate.isBefore(expectedStartDate);
 }
}
