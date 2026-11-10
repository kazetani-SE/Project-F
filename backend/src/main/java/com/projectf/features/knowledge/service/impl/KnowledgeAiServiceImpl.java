package com.projectf.features.knowledge.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import com.projectf.features.knowledge.ai.AiModelDecision;
import com.projectf.features.knowledge.ai.AiModelRouter;
import com.projectf.features.knowledge.ai.LlmGateway;
import com.projectf.features.knowledge.ai.LocalHeuristicAiEngine;
import com.projectf.features.knowledge.ai.LocalHeuristicAiEngine.HeuristicFeedbackDraft;
import com.projectf.features.knowledge.dto.request.DraftIncidentAiRequest;
import com.projectf.features.knowledge.dto.request.GenerateFaqSuggestionsRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest;
import com.projectf.features.knowledge.dto.response.DraftIncidentAiResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionItemResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionsResultResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse.DepartmentActionItem;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse.SuggestedIncidentItem;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse;
import com.projectf.features.knowledge.entity.EventFaq;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.entity.EventFeedbackAiReport;
import com.projectf.features.knowledge.entity.EventIncident;
import com.projectf.features.knowledge.repository.FaqRepository;
import com.projectf.features.knowledge.repository.FeedbackAiReportRepository;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.repository.IncidentRepository;
import com.projectf.features.knowledge.service.KnowledgeAiService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KnowledgeAiServiceImpl implements KnowledgeAiService {

    private static final Logger LOG = LoggerFactory.getLogger(KnowledgeAiServiceImpl.class);
    private static final String KEY_DEPT = "department";
    private static final String KEY_ACTION = "action";
    private static final String KEY_TITLE = "title";
    private static final String KEY_SEVERITY = "severity";
    private static final String KEY_DEPTS = "departments";
    private static final String KEY_DESC = "description";
    private static final String KEY_ROOT_CAUSE = "rootCause";
    private static final String KEY_SOLUTION = "immediateSolution";
    private static final String KEY_LESSON = "lessonLearned";
    private static final String DEFAULT_PLAN = "PLAN";

    private final FeedbackRepository feedbackRepo;
    private final FeedbackAiReportRepository reportRepo;
    private final FaqRepository faqRepo;
    private final IncidentRepository incidentRepo;
    private final AiModelRouter modelRouter;
    private final LlmGateway llmGateway;
    private final LocalHeuristicAiEngine heuristicEngine;
    private final ObjectMapper objectMapper;

    public KnowledgeAiServiceImpl(
            FeedbackRepository feedbackRepo,
            FeedbackAiReportRepository reportRepo,
            FaqRepository faqRepo,
            IncidentRepository incidentRepo,
            AiModelRouter modelRouter,
            LlmGateway llmGateway,
            LocalHeuristicAiEngine heuristicEngine,
            ObjectMapper objectMapper
    ) {
        this.feedbackRepo = feedbackRepo;
        this.reportRepo = reportRepo;
        this.faqRepo = faqRepo;
        this.incidentRepo = incidentRepo;
        this.modelRouter = modelRouter;
        this.llmGateway = llmGateway;
        this.heuristicEngine = heuristicEngine;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FeedbackAiReportResponse> getSavedFeedbackReport(UUID eventId) {
        Optional<EventFeedbackAiReport> savedOpt = reportRepo.findByEventId(eventId);
        Optional<FeedbackAiReportResponse> result = Optional.empty();

        if (savedOpt.isPresent()) {
            EventFeedbackAiReport saved = savedOpt.get();
            List<EventFeedback> currentFeedbacks = feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId);
            int currentCount = currentFeedbacks.size();
            OffsetDateTime currentLatest = currentFeedbacks.isEmpty() ? null : currentFeedbacks.get(0).getSubmittedAt();

            int snapshotCount = saved.getFbCountSnap() == null ? 0 : saved.getFbCountSnap();
            int delta = Math.max(0, currentCount - snapshotCount);
            boolean hasNewerTimestamp = currentLatest != null
                    && saved.getLatestFbAtSnap() != null
                    && currentLatest.isAfter(saved.getLatestFbAtSnap());
            boolean isStale = currentCount != snapshotCount || hasNewerTimestamp;

            AiModelDecision decision = modelRouter.routeFeedbackReport(snapshotCount, 0);
            result = Optional.of(mapEntityToReportResponse(
                    saved,
                    decision.routingReason(),
                    currentCount,
                    delta,
                    isStale
            ));
        }
        return result;
    }

    @Override
    @Transactional
    public FeedbackAiReportResponse generateFeedbackReport(UUID eventId) {
        List<EventFeedback> feedbacks = feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId);
        int currentCount = feedbacks.size();
        OffsetDateTime latestSubmittedAt = feedbacks.isEmpty() ? null : feedbacks.get(0).getSubmittedAt();

        double rawAvg = feedbacks.stream()
                .filter(fb -> fb.getRatingScore() != null)
                .mapToInt(EventFeedback::getRatingScore)
                .average()
                .orElse(0.0);
        BigDecimal avgDecimal = BigDecimal.valueOf(rawAvg).setScale(2, RoundingMode.HALF_UP);

        String feedbackContext = buildFeedbackPromptContext(feedbacks, avgDecimal.doubleValue());
        AiModelDecision decision = modelRouter.routeFeedbackReport(currentCount, feedbackContext.length());

        HeuristicFeedbackDraft fallbackDraft = heuristicEngine.buildFeedbackReport(feedbacks, avgDecimal.doubleValue());
        HeuristicFeedbackDraft finalDraft = resolveCloudOrFallbackFeedbackDraft(
                decision,
                feedbackContext,
                fallbackDraft
        );

        EventFeedbackAiReport entity = reportRepo.findByEventId(eventId).orElseGet(EventFeedbackAiReport::new);
        entity.setEventId(eventId);
        entity.setModelUsed(decision.modelId());
        entity.setModelTier(decision.tier());
        entity.setFbCountSnap(currentCount);
        entity.setLatestFbAtSnap(latestSubmittedAt);
        entity.setAvgRatingSnap(avgDecimal);
        entity.setExecutiveSummary(finalDraft.executiveSummary());
        entity.setSentimentMap(finalDraft.sentimentMap());
        entity.setTopHighlights(finalDraft.topHighlights());
        entity.setTopImprovements(finalDraft.topImprovements());
        entity.setDepartmentActions(serializeDepartmentActions(finalDraft.departmentActions()));
        entity.setIncidentDrafts(serializeSuggestedIncidents(finalDraft.incidentDrafts()));
        entity.setGeneratedAt(OffsetDateTime.now());

        EventFeedbackAiReport saved = reportRepo.save(entity);
        return mapEntityToReportResponse(saved, decision.routingReason(), currentCount, 0, false);
    }

    @Override
    @Transactional(readOnly = true)
    public FaqSuggestionsResultResponse suggestFaqQuestions(
            UUID seriesId,
            GenerateFaqSuggestionsRequest request
    ) {
        int requestedCount = request.count() != null && request.count() > 0 ? Math.min(request.count(), 8) : 5;
        List<EventFaq> existingFaqs = faqRepo.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(seriesId);
        List<EventIncident> incidents = request.eventId() != null
                ? incidentRepo.findByEventIdOrderByCreatedAtDesc(request.eventId())
                : Collections.emptyList();

        AiModelDecision decision = modelRouter.routeFaqSuggestions(requestedCount);
        FaqSuggestionsResultResponse fallback = heuristicEngine.buildFaqSuggestions(
                request,
                existingFaqs,
                incidents,
                decision
        );

        String systemPrompt = "Bạn là AI Chuyên gia Quản trị Sự kiện CLB Đại học. "
                + "Hãy trả về JSON hợp lệ theo cấu trúc: "
                + "{\"suggestions\":[{\"question\":\"...\",\"category\":\"...\",\"rationale\":\"...\",\"answerHint\":\"...\"}]}";
        String userPrompt = "Chủ đề trọng tâm: " + (request.focusTopic() == null ? "Tổng hợp đa mục" : request.focusTopic())
                + ". Số lượng câu hỏi cần tạo: " + requestedCount
                + ". Tránh trùng với các FAQ đã có: "
                + existingFaqs.stream().map(EventFaq::getQuestion).limit(10).toList();

        Optional<String> llmJsonOpt = llmGateway.invokeStructuredJson(decision, systemPrompt, userPrompt);
        FaqSuggestionsResultResponse result = fallback;
        if (llmJsonOpt.isPresent()) {
            Optional<FaqSuggestionsResultResponse> parsedOpt = parseFaqSuggestionsJson(llmJsonOpt.get(), decision);
            if (parsedOpt.isPresent()) {
                result = parsedOpt.get();
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public DraftIncidentAiResponse draftIncidentPostMortem(
            UUID eventId,
            DraftIncidentAiRequest request
    ) {
        AiModelDecision decision = modelRouter.routeIncidentDraft(request.briefObservation());
        DraftIncidentAiResponse fallback = heuristicEngine.buildIncidentDraft(request, decision);

        String systemPrompt = "Bạn là AI Trợ lý Phân tích Sự cố Post-Mortem (5-Whys) cho CLB Sự kiện. "
                + "Hãy trả về duy nhất JSON: "
                + "{\"title\":\"...\",\"severity\":\"LOW|MEDIUM|HIGH|CRITICAL\","
                + "\"departments\":[\"HR\",\"PLAN\",\"MEDIA\",\"ACADEMIC\"],"
                + "\"description\":\"...\",\"rootCause\":\"...\","
                + "\"immediateSolution\":\"...\",\"lessonLearned\":\"...\"}";
        String userPrompt = "Sự kiện: " + (request.eventTitle() == null ? eventId.toString() : request.eventTitle())
                + "\nMô tả hiện tượng ban đầu: " + request.briefObservation();

        Optional<String> llmJsonOpt = llmGateway.invokeStructuredJson(decision, systemPrompt, userPrompt);
        DraftIncidentAiResponse result = fallback;
        if (llmJsonOpt.isPresent()) {
            Optional<DraftIncidentAiResponse> parsedOpt = parseIncidentDraftJson(llmJsonOpt.get(), decision, fallback);
            if (parsedOpt.isPresent()) {
                result = parsedOpt.get();
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeChatResponse chatWithKnowledgeBase(UUID eventId, KnowledgeChatRequest request) {
        List<EventIncident> incidents = incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId);
        List<EventFeedback> feedbacks = feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId);
        List<EventFaq> faqs = request.seriesId() != null
                ? faqRepo.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(request.seriesId())
                : faqRepo.findAll();

        AiModelDecision decision = modelRouter.routeKnowledgeChat(request.message());
        KnowledgeChatResponse fallback = heuristicEngine.buildChatResponse(
                request,
                faqs,
                incidents,
                feedbacks,
                decision
        );

        String systemPrompt = "Bạn là Trợ lý AI Đa Mùa của Ban Tổ Chức Sự kiện (Project F). "
                + "Chỉ dựa trên dữ liệu FAQ, Sự cố Post-Mortem và Feedback được cung cấp để trả lời chính xác bằng tiếng Việt. "
                + "Trả về JSON: {\"answer\":\"...\",\"followUpQuestions\":[\"...\",\"...\"]}";
        String userPrompt = buildRagChatPrompt(request.message(), faqs, incidents, feedbacks);

        Optional<String> llmJsonOpt = llmGateway.invokeStructuredJson(decision, systemPrompt, userPrompt);
        KnowledgeChatResponse result = fallback;
        if (llmJsonOpt.isPresent()) {
            Optional<KnowledgeChatResponse> parsedOpt = parseChatJson(llmJsonOpt.get(), decision, fallback);
            if (parsedOpt.isPresent()) {
                result = parsedOpt.get();
            }
        }
        return result;
    }

    private HeuristicFeedbackDraft resolveCloudOrFallbackFeedbackDraft(
            AiModelDecision decision,
            String feedbackContext,
            HeuristicFeedbackDraft fallbackDraft
    ) {
        HeuristicFeedbackDraft chosen = fallbackDraft;
        String systemPrompt = "Bạn là Chuyên gia Phân tích Dữ liệu Khảo sát Sự kiện. "
                + "Hãy đọc dữ liệu khảo sát và trả về JSON theo cấu trúc: "
                + "{\"executiveSummary\":\"...\","
                + "\"topHighlights\":[\"...\"],"
                + "\"topImprovements\":[\"...\"],"
                + "\"departmentActions\":[{\"department\":\"PLAN|MEDIA|HR|ACADEMIC\",\"action\":\"...\"}}]}";

        Optional<String> llmJsonOpt = llmGateway.invokeStructuredJson(decision, systemPrompt, feedbackContext);
        if (llmJsonOpt.isPresent()) {
            try {
                JsonNode root = objectMapper.readTree(llmJsonOpt.get());
                String summary = root.path("executiveSummary").asText(fallbackDraft.executiveSummary());
                List<String> highlights = readStringList(root.path("topHighlights"), fallbackDraft.topHighlights());
                List<String> improvements = readStringList(root.path("topImprovements"), fallbackDraft.topImprovements());
                List<DepartmentActionItem> deptActions = readDeptActions(
                        root.path("departmentActions"),
                        fallbackDraft.departmentActions()
                );

                chosen = new HeuristicFeedbackDraft(
                        summary,
                        fallbackDraft.sentimentMap(),
                        highlights,
                        improvements,
                        deptActions,
                        fallbackDraft.incidentDrafts()
                );
            } catch (Exception ex) {
                if (LOG.isDebugEnabled()) {
                    LOG.debug("Không thể đọc JSON báo cáo từ LLM, dùng bản tổng hợp Heuristic: {}", ex.getMessage());
                }
            }
        }
        return chosen;
    }

    private Optional<FaqSuggestionsResultResponse> parseFaqSuggestionsJson(
            String json,
            AiModelDecision decision
    ) {
        Optional<FaqSuggestionsResultResponse> result = Optional.empty();
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode arr = root.path("suggestions");
            if (arr.isArray() && !arr.isEmpty()) {
                List<FaqSuggestionItemResponse> items = new ArrayList<>();
                for (JsonNode node : arr) {
                    Optional<FaqSuggestionItemResponse> itemOpt = toFaqSuggestionItem(node);
                    itemOpt.ifPresent(items::add);
                }
                if (!items.isEmpty()) {
                    result = Optional.of(new FaqSuggestionsResultResponse(
                            decision.modelId(),
                            decision.tier(),
                            decision.routingReason(),
                            items
                    ));
                }
            }
        } catch (Exception ex) {
            if (LOG.isDebugEnabled()) {
                LOG.debug("Lỗi parse JSON gợi ý FAQ từ LLM: {}", ex.getMessage());
            }
        }
        return result;
    }

    private Optional<FaqSuggestionItemResponse> toFaqSuggestionItem(JsonNode node) {
        Optional<FaqSuggestionItemResponse> itemOpt = Optional.empty();
        String question = node.path("question").asText("").trim();
        if (!question.isEmpty()) {
            itemOpt = Optional.of(new FaqSuggestionItemResponse(
                    question,
                    node.path("category").asText("Thể lệ & Tham dự"),
                    node.path("rationale").asText("Câu hỏi dự kiến thường gặp từ người tham gia."),
                    node.path("answerHint").asText("Điền quy định cụ thể của BTC cho mục này.")
            ));
        }
        return itemOpt;
    }

    private Optional<DraftIncidentAiResponse> parseIncidentDraftJson(
            String json,
            AiModelDecision decision,
            DraftIncidentAiResponse fallback
    ) {
        Optional<DraftIncidentAiResponse> result = Optional.empty();
        try {
            JsonNode root = objectMapper.readTree(json);
            String title = root.path(KEY_TITLE).asText(fallback.title());
            IncidentSeverity severity = parseSeverity(root.path(KEY_SEVERITY).asText(""), fallback.severity());
            List<Department> departments = parseDepartments(root.path(KEY_DEPTS), fallback.departments());

            result = Optional.of(new DraftIncidentAiResponse(
                    title,
                    severity,
                    departments,
                    root.path(KEY_DESC).asText(fallback.description()),
                    root.path(KEY_ROOT_CAUSE).asText(fallback.rootCause()),
                    root.path(KEY_SOLUTION).asText(fallback.immediateSolution()),
                    root.path(KEY_LESSON).asText(fallback.lessonLearned()),
                    decision.modelId(),
                    decision.tier(),
                    decision.routingReason()
            ));
        } catch (Exception ex) {
            if (LOG.isDebugEnabled()) {
                LOG.debug("Lỗi parse JSON sự cố từ LLM: {}", ex.getMessage());
            }
        }
        return result;
    }

    private Optional<KnowledgeChatResponse> parseChatJson(
            String json,
            AiModelDecision decision,
            KnowledgeChatResponse fallback
    ) {
        Optional<KnowledgeChatResponse> result = Optional.empty();
        try {
            JsonNode root = objectMapper.readTree(json);
            String answer = root.path("answer").asText("").trim();
            if (!answer.isEmpty()) {
                List<String> followUps = readStringList(
                        root.path("followUpQuestions"),
                        fallback.followUpQuestions()
                );
                result = Optional.of(new KnowledgeChatResponse(
                        answer,
                        decision.modelId(),
                        decision.tier(),
                        decision.routingReason(),
                        fallback.citations(),
                        followUps
                ));
            }
        } catch (Exception ex) {
            if (LOG.isDebugEnabled()) {
                LOG.debug("Lỗi parse JSON chat từ LLM: {}", ex.getMessage());
            }
        }
        return result;
    }

    private String buildFeedbackPromptContext(List<EventFeedback> feedbacks, double avgRating) {
        StringBuilder sb = new StringBuilder(512);
        sb.append("Tổng số phiếu: ").append(feedbacks.size())
                .append(", Điểm trung bình (quy đổi thang 5): ").append(avgRating).append('\n');

        int limit = Math.min(feedbacks.size(), 40);
        for (int idx = 0; idx < limit; idx++) {
            EventFeedback fb = feedbacks.get(idx);
            sb.append("- [").append(fb.getSourceType()).append(" | ").append(fb.getRatingScore()).append("★] ");
            if (fb.getHighlightContent() != null && !fb.getHighlightContent().isBlank()) {
                sb.append("Điểm tốt: ").append(fb.getHighlightContent()).append("; ");
            }
            if (fb.getImproveContent() != null && !fb.getImproveContent().isBlank()) {
                sb.append("Cần cải thiện: ").append(fb.getImproveContent());
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    private String buildRagChatPrompt(
            String userQuestion,
            List<EventFaq> faqs,
            List<EventIncident> incidents,
            List<EventFeedback> feedbacks
    ) {
        StringBuilder sb = new StringBuilder(512);
        sb.append("Câu hỏi của thành viên BTC: ").append(userQuestion)
                .append("\n\n=== DỮ LIỆU FAQ ===\n");
        faqs.stream().limit(8).forEach(faq ->
                sb.append("Q: ").append(faq.getQuestion()).append(" | A: ").append(faq.getAnswer()).append('\n')
        );
        sb.append("\n=== NHẬT KÝ SỰ CỐ & POST-MORTEM ===\n");
        incidents.stream().limit(6).forEach(inc ->
                sb.append("- [").append(inc.getSeverity()).append("] ").append(inc.getTitle())
                        .append(" | Nguyên nhân: ").append(inc.getRootCause())
                        .append(" | Bài học: ").append(inc.getLessonLearned()).append('\n')
        );
        sb.append("\n=== TỔNG QUAN FEEDBACK ===\nSố lượng phiếu: ")
                .append(feedbacks.size()).append('\n');
        return sb.toString();
    }

    private FeedbackAiReportResponse mapEntityToReportResponse(
            EventFeedbackAiReport entity,
            String routingReason,
            int currentCount,
            int deltaCount,
            boolean isStale
    ) {
        List<DepartmentActionItem> deptActions = deserializeDepartmentActions(entity.getDepartmentActions());
        List<SuggestedIncidentItem> incDrafts = deserializeSuggestedIncidents(entity.getIncidentDrafts());
        double avgRating = entity.getAvgRatingSnap() == null
                ? 0.0
                : entity.getAvgRatingSnap().doubleValue();

        return new FeedbackAiReportResponse(
                entity.getId(),
                entity.getEventId(),
                entity.getModelUsed(),
                entity.getModelTier(),
                routingReason,
                entity.getFbCountSnap() == null ? 0 : entity.getFbCountSnap(),
                currentCount,
                deltaCount,
                isStale,
                avgRating,
                entity.getExecutiveSummary(),
                entity.getSentimentMap() == null ? Collections.emptyMap() : entity.getSentimentMap(),
                entity.getTopHighlights() == null ? Collections.emptyList() : entity.getTopHighlights(),
                entity.getTopImprovements() == null ? Collections.emptyList() : entity.getTopImprovements(),
                deptActions,
                incDrafts,
                entity.getGeneratedAt(),
                entity.getUpdatedAt()
        );
    }

    private List<Map<String, String>> serializeDepartmentActions(List<DepartmentActionItem> items) {
        return items == null
                ? Collections.emptyList()
                : items.stream()
                        .map(item -> Map.of(KEY_DEPT, item.department(), KEY_ACTION, item.action()))
                        .toList();
    }

    private List<DepartmentActionItem> deserializeDepartmentActions(List<Map<String, String>> rawList) {
        return rawList == null
                ? Collections.emptyList()
                : rawList.stream()
                        .map(row -> new DepartmentActionItem(
                                row.getOrDefault(KEY_DEPT, DEFAULT_PLAN),
                                row.getOrDefault(KEY_ACTION, "")
                        ))
                        .toList();
    }

    private List<Map<String, Object>> serializeSuggestedIncidents(List<SuggestedIncidentItem> items) {
        return items == null
                ? Collections.emptyList()
                : items.stream()
                        .map(item -> Map.<String, Object>of(
                                KEY_TITLE, item.title(),
                                KEY_SEVERITY, item.severity(),
                                KEY_DEPTS, item.departments(),
                                KEY_DESC, item.description(),
                                KEY_ROOT_CAUSE, item.rootCause(),
                                KEY_SOLUTION, item.immediateSolution(),
                                KEY_LESSON, item.lessonLearned()
                        ))
                        .toList();
    }

    @SuppressWarnings("unchecked")
    private List<SuggestedIncidentItem> deserializeSuggestedIncidents(List<Map<String, Object>> rawList) {
        return rawList == null
                ? Collections.emptyList()
                : rawList.stream()
                        .map(row -> {
                            Object rawDepts = row.get(KEY_DEPTS);
                            List<String> depts = rawDepts instanceof List<?>
                                    ? ((List<Object>) rawDepts).stream().map(String::valueOf).toList()
                                    : List.of(DEFAULT_PLAN);
                            return new SuggestedIncidentItem(
                                    String.valueOf(row.getOrDefault(KEY_TITLE, "")),
                                    String.valueOf(row.getOrDefault(KEY_SEVERITY, "MEDIUM")),
                                    depts,
                                    String.valueOf(row.getOrDefault(KEY_DESC, "")),
                                    String.valueOf(row.getOrDefault(KEY_ROOT_CAUSE, "")),
                                    String.valueOf(row.getOrDefault(KEY_SOLUTION, "")),
                                    String.valueOf(row.getOrDefault(KEY_LESSON, ""))
                            );
                        })
                        .toList();
    }

    private List<String> readStringList(JsonNode node, List<String> defaultList) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode item : node) {
                String text = item.asText("").trim();
                if (!text.isEmpty()) {
                    list.add(text);
                }
            }
        }
        return list.isEmpty() ? defaultList : list;
    }

    private List<DepartmentActionItem> readDeptActions(JsonNode node, List<DepartmentActionItem> defaultList) {
        List<DepartmentActionItem> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode item : node) {
                Optional<DepartmentActionItem> actionOpt = toDeptActionItem(item);
                actionOpt.ifPresent(list::add);
            }
        }
        return list.isEmpty() ? defaultList : list;
    }

    private Optional<DepartmentActionItem> toDeptActionItem(JsonNode item) {
        Optional<DepartmentActionItem> result = Optional.empty();
        String dept = item.path(KEY_DEPT).asText(DEFAULT_PLAN).trim();
        String action = item.path(KEY_ACTION).asText("").trim();
        if (!action.isEmpty()) {
            result = Optional.of(new DepartmentActionItem(dept, action));
        }
        return result;
    }

    private IncidentSeverity parseSeverity(String value, IncidentSeverity defaultSeverity) {
        IncidentSeverity result = defaultSeverity;
        try {
            if (value != null && !value.isBlank()) {
                result = IncidentSeverity.valueOf(value.trim().toUpperCase(Locale.ROOT));
            }
        } catch (IllegalArgumentException ex) {
            if (LOG.isDebugEnabled()) {
                LOG.debug("Giá trị severity không hợp lệ ({}), dùng mặc định.", value);
            }
        }
        return result;
    }

    private List<Department> parseDepartments(JsonNode arrayNode, List<Department> defaultDepts) {
        List<Department> list = new ArrayList<>();
        if (arrayNode != null && arrayNode.isArray()) {
            for (JsonNode item : arrayNode) {
                try {
                    list.add(Department.valueOf(item.asText("").trim().toUpperCase(Locale.ROOT)));
                } catch (IllegalArgumentException ex) {
                    if (LOG.isDebugEnabled()) {
                        LOG.debug("Giá trị department không hợp lệ: {}", item.asText());
                    }
                }
            }
        }
        return list.isEmpty() ? defaultDepts : list;
    }
}
