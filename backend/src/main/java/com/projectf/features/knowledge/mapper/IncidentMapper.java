package com.projectf.features.knowledge.mapper;

import com.projectf.features.knowledge.dto.request.CreateIncidentRequest;
import com.projectf.features.knowledge.dto.response.IncidentResponse;
import com.projectf.features.knowledge.entity.EventIncident;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class IncidentMapper {

    public EventIncident toEntity(UUID eventId, CreateIncidentRequest request) {
        EventIncident incident = new EventIncident();
        incident.setEventId(eventId);
        incident.setReportedBy(request.reportedBy());
        incident.setTitle(request.title());
        incident.setSeverity(request.severity());
        incident.setDepartments(request.departments());
        incident.setDescription(request.description());
        incident.setRootCause(request.rootCause());
        incident.setImmediateSolution(request.immediateSolution());
        incident.setLessonLearned(request.lessonLearned());
        return incident;
    }

    public IncidentResponse toResponse(EventIncident entity) {
        return new IncidentResponse(
                entity.getId(),
                entity.getEventId(),
                entity.getReportedBy(),
                entity.getTitle(),
                entity.getSeverity(),
                entity.getDepartments(),
                entity.getDescription(),
                entity.getRootCause(),
                entity.getImmediateSolution(),
                entity.getLessonLearned(),
                entity.getCreatedAt()
        );
    }
}
