package com.projectf.features.knowledge.service;

import com.projectf.features.knowledge.dto.request.CreateFeedbackRequest;
import com.projectf.features.knowledge.dto.response.FeedbackResponse;
import com.projectf.features.knowledge.dto.response.FeedbackSummaryResponse;
import java.util.List;
import java.util.UUID;

public interface FeedbackService {
    List<FeedbackResponse> getFeedbacksByEvent(UUID eventId);

    FeedbackSummaryResponse getFeedbackSummaryByEvent(UUID eventId);

    FeedbackResponse submitFeedback(UUID eventId, CreateFeedbackRequest request);

    List<FeedbackResponse> submitFeedbacksBatch(UUID eventId, List<CreateFeedbackRequest> requests);
}
