package com.projectf.features.event.service;
import com.projectf.features.event.dto.request.AssignOrganizerRequest;
import com.projectf.features.event.dto.request.CreateEventRequest;
import com.projectf.features.event.dto.request.CreateEventSeriesRequest;
import com.projectf.features.event.dto.request.UpdateEventRequest;
import com.projectf.features.event.dto.request.UpdateEventSeriesRequest;
import com.projectf.features.event.dto.response.EventResponse;
import com.projectf.features.event.dto.response.EventSeriesResponse;
import com.projectf.features.event.dto.response.OrganizerResponse;
import com.projectf.features.event.entity.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;
/** Hợp đồng nghiệp vụ; chỉ triển khai sau khi chốt quy tắc event và migration role. */
public interface EventService {
 EventSeriesResponse createSeries(CreateEventSeriesRequest request);
 EventSeriesResponse getSeries(UUID seriesId);
 Page<EventSeriesResponse> listSeries(Pageable pageable);
 EventSeriesResponse updateSeries(UUID seriesId,UpdateEventSeriesRequest request);
 EventResponse create(CreateEventRequest request);
 EventResponse get(UUID eventId);
 Page<EventResponse> list(UUID seriesId,EventStatus status,Pageable pageable);
 EventResponse update(UUID eventId,UpdateEventRequest request);
 OrganizerResponse assign(AssignOrganizerRequest request);
 Page<OrganizerResponse> listOrganizers(UUID eventId,Pageable pageable);
 void removeOrganizer(UUID eventId,UUID memberId);
}
