package com.projectf.features.knowledge.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record FeedbackAiReportResponse(
        UUID id,
        UUID eventId,
        String modelUsed,
        String modelTier,
        String routingReason,
        @JsonProperty("feedbackCountSnapshot") int fbCountSnap,
        @JsonProperty("currentFeedbackCount") int currentFbCount,
        @JsonProperty("newFeedbackCountDelta") int newFbDelta,
        boolean isStale,
        @JsonProperty("averageRatingSnapshot") double avgRatingSnap,
        String executiveSummary,
        @JsonProperty("sentimentBreakdown") Map<String, Integer> sentimentMap,
        List<String> topHighlights,
        List<String> topImprovements,
        List<DepartmentActionItem> departmentActions,
        @JsonProperty("suggestedIncidents") List<SuggestedIncidentItem> incidentDrafts,
        OffsetDateTime generatedAt,
        OffsetDateTime updatedAt
) {
    public record DepartmentActionItem(
            String department,
            String action
    ) {
    }

    public record SuggestedIncidentItem(
            String title,
            String severity,
            List<String> departments,
            String description,
            String rootCause,
            String immediateSolution,
            String lessonLearned
    ) {
    }
}
