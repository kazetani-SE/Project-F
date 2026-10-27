package com.projectf.features.event.mapper;
import com.projectf.features.event.dto.request.*;
import com.projectf.features.event.dto.response.*;
import com.projectf.features.event.entity.*;
import org.springframework.stereotype.Component;
@Component
public class EventMapper {
 public EventResponse toResponse(Event e) {
  return new EventResponse(e.getId(),e.getSeriesId(),e.getSeasonName(),e.getTitle(),e.getDescription(),
   e.getExpectedStartDate(),e.getExpectedEndDate(),e.getActualStartDate(),e.getActualEndDate(),
   e.getStatus(),e.getAllocatedFund(),e.getCreatedAt(),e.getUpdatedAt());
 }
 public EventSeriesResponse toResponse(EventSeries e) {
  return new EventSeriesResponse(e.getId(),e.getName(),e.getDescription(),e.getCreatedAt());
 }
 public OrganizerResponse toResponse(EventOrganizer e) {
  return new OrganizerResponse(e.getId(),e.getEventId(),e.getMemberId(),e.getRole(),e.getAssignedTasks(),e.getJoinedAt());
 }
 public Event toEntity(CreateEventRequest r) {
  Event e=new Event(); e.setSeriesId(r.seriesId()); e.setSeasonName(r.seasonName()); e.setTitle(r.title());
  e.setDescription(r.description()); e.setExpectedStartDate(r.expectedStartDate()); e.setExpectedEndDate(r.expectedEndDate());
  e.setAllocatedFund(r.allocatedFund());
  return e;
 }
 public EventSeries toEntity(CreateEventSeriesRequest r) {
  EventSeries e=new EventSeries(); e.setName(r.name()); e.setDescription(r.description()); return e;
 }
 public EventOrganizer toEntity(AssignOrganizerRequest r) {
  EventOrganizer e=new EventOrganizer(); e.setEventId(r.eventId()); e.setMemberId(r.memberId());
  e.setRole(r.role()); e.setAssignedTasks(r.assignedTasks()); return e;
 }
 public void update(Event e,UpdateEventRequest r) {
  e.setSeriesId(r.seriesId()); e.setSeasonName(r.seasonName()); e.setTitle(r.title()); e.setDescription(r.description());
  e.setExpectedStartDate(r.expectedStartDate()); e.setExpectedEndDate(r.expectedEndDate());
  e.setActualStartDate(r.actualStartDate()); e.setActualEndDate(r.actualEndDate());
  e.setStatus(r.status()); e.setAllocatedFund(r.allocatedFund());
 }
}
