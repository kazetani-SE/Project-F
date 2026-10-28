package com.projectf.features.event.dto.request;
import com.projectf.features.event.entity.EventStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record UpdateEventRequest(UUID seriesId,@NotBlank @Size(max=50) String seasonName,
 @NotBlank @Size(max=255) String title,String description,@NotNull LocalDate expectedStartDate,
 @NotNull LocalDate expectedEndDate,LocalDate actualStartDate,LocalDate actualEndDate,
 EventStatus status,@PositiveOrZero BigDecimal allocatedFund) {
 @AssertTrue(message="expectedEndDate phải lớn hơn hoặc bằng expectedStartDate")
 public boolean isExpectedDateRangeValid() {
  return expectedStartDate == null || expectedEndDate == null || !expectedEndDate.isBefore(expectedStartDate);
 }
 @AssertTrue(message="actualEndDate phải lớn hơn hoặc bằng actualStartDate")
 public boolean isActualDateRangeValid() {
  return actualEndDate == null || (actualStartDate != null && !actualEndDate.isBefore(actualStartDate));
 }
}
