package com.projectf.features.knowledge.service;

import com.projectf.features.knowledge.dto.request.CreateIncidentRequest;
import com.projectf.features.knowledge.dto.response.IncidentResponse;
import java.util.List;
import java.util.UUID;

public interface IncidentService {
    List<IncidentResponse> getIncidentsByEvent(UUID eventId);

    IncidentResponse getIncidentById(UUID incidentId);

    IncidentResponse createIncident(UUID eventId, CreateIncidentRequest request);

    void deleteIncident(UUID incidentId);
}
