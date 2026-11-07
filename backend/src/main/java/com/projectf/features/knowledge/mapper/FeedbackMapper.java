package com.projectf.features.knowledge.mapper;

import com.projectf.features.knowledge.dto.request.CreateFeedbackRequest;
import com.projectf.features.knowledge.dto.response.FeedbackResponse;
import com.projectf.features.knowledge.entity.EventFeedback;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class FeedbackMapper {

    public EventFeedback toEntity(UUID eventId, CreateFeedbackRequest request) {
        EventFeedback feedback = new EventFeedback();
        feedback.setEventId(eventId);
        feedback.setSourceType(request.sourceType() == null || request.sourceType().isBlank() ? "ATTENDEE" : request.sourceType());
        feedback.setFileUrl(request.fileUrl());
        feedback.setRatingScore(request.ratingScore());
        feedback.setHighlightContent(request.highlightContent());
        feedback.setImproveContent(request.improveContent());
        feedback.setCustomResponses(request.customResponses());
        return feedback;
    }

    public FeedbackResponse toResponse(EventFeedback entity) {
        return new FeedbackResponse(
                entity.getId(),
                entity.getEventId(),
                entity.getSourceType(),
                entity.getFileUrl(),
                entity.getRatingScore(),
                entity.getHighlightContent(),
                entity.getImproveContent(),
                entity.getCustomResponses(),
                entity.getSubmittedAt()
        );
    }
}
