package com.projectf.features.knowledge.service.impl;

import com.projectf.features.knowledge.dto.request.CreateFeedbackRequest;
import com.projectf.features.knowledge.dto.response.FeedbackResponse;
import com.projectf.features.knowledge.dto.response.FeedbackSummaryResponse;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.mapper.FeedbackMapper;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.service.FeedbackService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeedbackServiceImpl implements FeedbackService {

    private static final Set<String> VALID_SOURCES = Set.of(
            "ATTENDEE",
            "ORGANIZER",
            "SPONSOR",
            "SPEAKER"
    );

    private final FeedbackRepository feedbackRepo;
    private final FeedbackMapper feedbackMapper;

    public FeedbackServiceImpl(FeedbackRepository feedbackRepo, FeedbackMapper feedbackMapper) {
        this.feedbackRepo = feedbackRepo;
        this.feedbackMapper = feedbackMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackResponse> getFeedbacksByEvent(UUID eventId) {
        return feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId).stream()
                .map(feedbackMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackSummaryResponse getFeedbackSummaryByEvent(UUID eventId) {
        List<EventFeedback> feedbacks = feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId);
        long total = feedbacks.size();
        double avg = 0.0;
        Map<Integer, Long> breakdown = new HashMap<>();

        if (total == 0) {
            for (int score = 1; score <= 5; score++) {
                breakdown.put(score, 0L);
            }
        } else {
            double rawAvg = feedbacks.stream()
                    .mapToInt(EventFeedback::getRatingScore)
                    .average()
                    .orElse(0.0);
            avg = BigDecimal.valueOf(rawAvg)
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();

            breakdown = feedbacks.stream()
                    .collect(Collectors.groupingBy(EventFeedback::getRatingScore, Collectors.counting()));
            for (int score = 1; score <= 5; score++) {
                breakdown.putIfAbsent(score, 0L);
            }
        }

        return new FeedbackSummaryResponse(eventId, total, avg, breakdown);
    }

    @Override
    @Transactional
    public FeedbackResponse submitFeedback(UUID eventId, CreateFeedbackRequest request) {
        if (request.sourceType() != null && !request.sourceType().isBlank()
                && !VALID_SOURCES.contains(request.sourceType())) {
            throw new IllegalArgumentException("Nguồn đánh giá không hợp lệ: " + request.sourceType());
        }
        EventFeedback entity = feedbackMapper.toEntity(eventId, request);
        EventFeedback saved = feedbackRepo.save(entity);
        return feedbackMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public List<FeedbackResponse> submitFeedbacksBatch(UUID eventId, List<CreateFeedbackRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        for (CreateFeedbackRequest request : requests) {
            if (request.sourceType() != null && !request.sourceType().isBlank()
                    && !VALID_SOURCES.contains(request.sourceType())) {
                throw new IllegalArgumentException("Nguồn đánh giá không hợp lệ: " + request.sourceType());
            }
        }
        List<EventFeedback> entities = requests.stream()
                .map(req -> feedbackMapper.toEntity(eventId, req))
                .toList();
        List<EventFeedback> saved = feedbackRepo.saveAll(entities);
        return saved.stream()
                .map(feedbackMapper::toResponse)
                .toList();
    }
}
