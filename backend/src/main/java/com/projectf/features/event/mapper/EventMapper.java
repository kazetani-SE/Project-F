package com.projectf.features.event.mapper;
import com.projectf.features.event.dto.request.AssignOrganizerRequest;
import com.projectf.features.event.dto.request.CreateEventRequest;
import com.projectf.features.event.dto.request.CreateEventSeriesRequest;
import com.projectf.features.event.dto.request.UpdateEventRequest;
import com.projectf.features.event.dto.request.UpdateEventSeriesRequest;
import com.projectf.features.event.dto.response.EventResponse;
import com.projectf.features.event.dto.response.EventSeriesResponse;
import com.projectf.features.event.dto.response.OrganizerResponse;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.entity.EventOrganizer;
import com.projectf.features.event.entity.EventSeries;
import org.springframework.stereotype.Component;
@Component
@SuppressWarnings("PMD.AtLeastOneConstructor") // Spring dùng constructor mặc định; constructor rỗng tường minh bị PMD coi là thừa.
public class EventMapper {
 public EventResponse toResponse(final Event event) {
  return new EventResponse(event.getId(),event.getSeriesId(),event.getSeasonName(),event.getTitle(),event.getDescription(),
   event.getExpectedStartDate(),event.getExpectedEndDate(),event.getActualStartDate(),event.getActualEndDate(),
   event.getStatus(),event.getAllocatedFund(),event.getCreatedAt(),event.getUpdatedAt());
 }
 public EventSeriesResponse toResponse(final EventSeries series) {
  return new EventSeriesResponse(series.getId(),series.getName(),series.getDescription(),series.getCreatedAt());
 }
 public OrganizerResponse toResponse(final EventOrganizer organizer) {
  return new OrganizerResponse(organizer.getId(),organizer.getEventId(),organizer.getMemberId(),organizer.getRole(),
   organizer.getAssignedTasks(),organizer.getJoinedAt());
 }
 public Event toEntity(final CreateEventRequest request) {
  final Event event=new Event();
  event.setSeriesId(request.seriesId()); event.setSeasonName(request.seasonName()); event.setTitle(request.title());
  event.setDescription(request.description()); event.setExpectedStartDate(request.expectedStartDate());
  event.setExpectedEndDate(request.expectedEndDate()); event.setAllocatedFund(request.allocatedFund());
  return event;
 }
 public EventSeries toEntity(final CreateEventSeriesRequest request) {
  final EventSeries series=new EventSeries();
  series.setName(request.name()); series.setDescription(request.description()); return series;
 }
 public void updateSeries(final EventSeries series,final UpdateEventSeriesRequest request) {
  series.setName(request.name());
  series.setDescription(request.description());
 }
 public EventOrganizer toEntity(final AssignOrganizerRequest request) {
  final EventOrganizer organizer=new EventOrganizer();
  organizer.setEventId(request.eventId()); organizer.setMemberId(request.memberId());
  organizer.setRole(request.role()); organizer.setAssignedTasks(request.assignedTasks()); return organizer;
 }
 public void update(final Event event,final UpdateEventRequest request) {
  event.setSeriesId(request.seriesId()); event.setSeasonName(request.seasonName());
  event.setTitle(request.title()); event.setDescription(request.description());
  event.setExpectedStartDate(request.expectedStartDate()); event.setExpectedEndDate(request.expectedEndDate());
  event.setActualStartDate(request.actualStartDate()); event.setActualEndDate(request.actualEndDate());
  if (request.status() != null) {
   event.setStatus(request.status());
  }
  if (request.allocatedFund() != null) {
   event.setAllocatedFund(request.allocatedFund());
  }
 }
}
