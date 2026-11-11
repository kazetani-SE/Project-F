package com.projectf.features.knowledge.service.impl;

import com.projectf.features.knowledge.dto.request.CreateIncidentRequest;
import com.projectf.features.knowledge.dto.response.IncidentResponse;
import com.projectf.features.knowledge.entity.EventIncident;
import com.projectf.features.knowledge.mapper.IncidentMapper;
import com.projectf.features.knowledge.repository.IncidentRepository;
import com.projectf.features.knowledge.service.IncidentService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IncidentServiceImpl implements IncidentService {

    private final IncidentRepository incidentRepo;
    private final IncidentMapper incidentMapper;

    public IncidentServiceImpl(IncidentRepository incidentRepo, IncidentMapper incidentMapper) {
        this.incidentRepo = incidentRepo;
        this.incidentMapper = incidentMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<IncidentResponse> getIncidentsByEvent(UUID eventId) {
        return incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId).stream()
                .map(incidentMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public IncidentResponse getIncidentById(UUID incidentId) {
        EventIncident incident = incidentRepo.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhật ký sự cố với ID: " + incidentId));
        return incidentMapper.toResponse(incident);
    }

    @Override
    @Transactional
    public IncidentResponse createIncident(UUID eventId, CreateIncidentRequest request) {
        EventIncident entity = incidentMapper.toEntity(eventId, request);
        EventIncident saved = incidentRepo.save(entity);
        return incidentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteIncident(UUID incidentId) {
        EventIncident incident = incidentRepo.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhật ký sự cố với ID: " + incidentId));
        incidentRepo.delete(incident);
    }
}
