package com.projectf.features.event.service;
import com.projectf.features.event.dto.request.*;
import com.projectf.features.event.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;
/** Hợp đồng nghiệp vụ; chỉ triển khai sau khi chốt quy tắc event và migration role. */
public interface EventService {
 EventSeriesResponse createSeries(CreateEventSeriesRequest request);
 EventResponse create(CreateEventRequest request);
 EventResponse get(UUID id);
 Page<EventResponse> list(Pageable pageable);
 EventResponse update(UUID id,UpdateEventRequest request);
 OrganizerResponse assign(AssignOrganizerRequest request);
}
