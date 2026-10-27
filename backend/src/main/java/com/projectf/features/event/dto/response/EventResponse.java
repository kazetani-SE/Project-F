package com.projectf.features.event.dto.response;
import com.projectf.features.event.entity.EventStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
// 'id' giữ đúng tên trường JSON của API.
@SuppressWarnings("PMD.ShortVariable")
public record EventResponse(UUID id,UUID seriesId,String seasonName,String title,String description,
 LocalDate expectedStartDate,LocalDate expectedEndDate,LocalDate actualStartDate,LocalDate actualEndDate,
 EventStatus status,BigDecimal allocatedFund,OffsetDateTime createdAt,OffsetDateTime updatedAt) {}
