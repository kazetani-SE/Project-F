package com.projectf.features.knowledge.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.knowledge.dto.request.CreateIncidentRequest;
import com.projectf.features.knowledge.dto.response.IncidentResponse;
import com.projectf.features.knowledge.service.IncidentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Knowledge - Incidents", description = "Ghi nhận và xử lý sự cố trong sự kiện")
@RestController
@RequestMapping("/v1")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping("/events/{eventId}/incidents")
    public ResponseEntity<ApiResponse<List<IncidentResponse>>> getIncidentsByEvent(
            @PathVariable("eventId") UUID eventId
    ) {
        List<IncidentResponse> response = incidentService.getIncidentsByEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/events/{eventId}/incidents")
    public ResponseEntity<ApiResponse<IncidentResponse>> createIncident(
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody CreateIncidentRequest request
    ) {
        IncidentResponse response = incidentService.createIncident(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/incidents/{incidentId}")
    public ResponseEntity<ApiResponse<IncidentResponse>> getIncidentById(
            @PathVariable("incidentId") UUID incidentId
    ) {
        IncidentResponse response = incidentService.getIncidentById(incidentId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
