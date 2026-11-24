package com.projectf.features.knowledge.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import com.projectf.features.knowledge.ai.AiModelDecision;
import com.projectf.features.knowledge.ai.AiModelRouter;
import com.projectf.features.knowledge.ai.KnowledgeContextRetriever;
import com.projectf.features.knowledge.ai.KnowledgeContextRetriever.FeedbackInsights;
import com.projectf.features.knowledge.ai.KnowledgeContextRetriever.RagPromptPackage;
import com.projectf.features.knowledge.ai.KnowledgePromptLibrary;
import com.projectf.features.knowledge.ai.LlmGateway;
import com.projectf.features.knowledge.ai.LlmGateway.LlmInvocationResult;
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
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse.CitationItem;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    private static final String DEFAULT_MEDIUM = "MEDIUM";

    private final FeedbackRepository feedbackRepo;
    private final FeedbackAiReportRepository reportRepo;
    private final FaqRepository faqRepo;
    private final IncidentRepository incidentRepo;
    private final KnowledgeContextRetriever contextRetriever;
    private final AiModelRouter modelRouter;
    private final LlmGateway llmGateway;
    private final LocalHeuristicAiEngine heuristicEngine;
    private final ObjectMapper objectMapper;

    public KnowledgeAiServiceImpl(
            FeedbackRepository feedbackRepo,
            FeedbackAiReportRepository reportRepo,
            FaqRepository faqRepo,
            IncidentRepository incidentRepo,
            KnowledgeContextRetriever contextRetriever,
            AiModelRouter modelRouter,
            LlmGateway llmGateway,
            LocalHeuristicAiEngine heuristicEngine,
            ObjectMapper objectMapper
    ) {
        this.feedbackRepo = feedbackRepo;
        this.reportRepo = reportRepo;
        this.faqRepo = faqRepo;
        this.incidentRepo = incidentRepo;
        this.contextRetriever = contextRetriever;
        this.modelRouter = modelRouter;
        this.llmGateway = llmGateway;
        this.heuristicEngine = heuristicEngine;
        this.objectMapper = objectMapper;
    }

    private record ResolvedFeedbackReport(
            HeuristicFeedbackDraft draft,
            String actualModelUsed,
            String actualTier,
            String routingReason
    ) {
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

            String reason = AiModelRouter.TIER_HEURISTIC.equalsIgnoreCase(saved.getModelTier())
                    ? "Báo cáo tổng hợp nội bộ Heuristic (chưa kết nối Cloud AI tại thời điểm tạo)"
                    : modelRouter.routeFeedbackReport(snapshotCount, 0).routingReason();
            result = Optional.of(mapEntityToReportResponse(
                    saved,
                    reason,
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

        String feedbackContext = contextRetriever.buildFeedbackReportContext(eventId, feedbacks, avgDecimal.doubleValue());
        AiModelDecision decision = modelRouter.routeFeedbackReport(currentCount, feedbackContext.length());

        HeuristicFeedbackDraft fallbackDraft = heuristicEngine.buildFeedbackReport(feedbacks, avgDecimal.doubleValue());
        ResolvedFeedbackReport resolved = resolveCloudOrFallbackFeedbackDraft(
                decision,
                feedbackContext,
                fallbackDraft
        );

        EventFeedbackAiReport entity = reportRepo.findByEventId(eventId).orElseGet(EventFeedbackAiReport::new);
        entity.setEventId(eventId);
        entity.setModelUsed(resolved.actualModelUsed());
        entity.setModelTier(resolved.actualTier());
        entity.setFbCountSnap(currentCount);
        entity.setLatestFbAtSnap(latestSubmittedAt);
        entity.setAvgRatingSnap(avgDecimal);
        entity.setExecutiveSummary(resolved.draft().executiveSummary());
        entity.setSentimentMap(resolved.draft().sentimentMap());
        entity.setTopHighlights(resolved.draft().topHighlights());
        entity.setTopImprovements(resolved.draft().topImprovements());
        entity.setDepartmentActions(serializeDepartmentActions(resolved.draft().departmentActions()));
        entity.setIncidentDrafts(serializeSuggestedIncidents(resolved.draft().incidentDrafts()));
        entity.setGeneratedAt(OffsetDateTime.now());

        EventFeedbackAiReport saved = reportRepo.save(entity);
        return mapEntityToReportResponse(saved, resolved.routingReason(), currentCount, 0, false);
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

        String systemPrompt = KnowledgePromptLibrary.faqSuggestionsSystemPrompt();
        String userPrompt = contextRetriever.buildFaqSuggestionContext(
                seriesId,
                request.eventId(),
                request.focusTopic(),
                requestedCount,
                existingFaqs
        );

        Optional<LlmInvocationResult> llmOpt = llmGateway.invokeWithMetadata(
                decision,
                systemPrompt,
                userPrompt,
                Collections.emptyList()
        );
        FaqSuggestionsResultResponse result = fallback;
        if (llmOpt.isPresent()) {
            LlmInvocationResult invocation = llmOpt.get();
            Optional<FaqSuggestionsResultResponse> parsedOpt = parseFaqSuggestionsJson(
                    invocation.jsonContent(),
                    invocation.actualModelUsed(),
                    invocation.actualTier(),
                    decision.routingReason()
            );
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

        String systemPrompt = KnowledgePromptLibrary.incidentPostMortemSystemPrompt();
        String userPrompt = contextRetriever.buildIncidentDraftContext(
                eventId,
                request.eventTitle(),
                request.briefObservation()
        );

        Optional<LlmInvocationResult> llmOpt = llmGateway.invokeWithMetadata(
                decision,
                systemPrompt,
                userPrompt,
                Collections.emptyList()
        );
        DraftIncidentAiResponse result = fallback;
        if (llmOpt.isPresent()) {
            LlmInvocationResult invocation = llmOpt.get();
            Optional<DraftIncidentAiResponse> parsedOpt = parseIncidentDraftJson(
                    invocation.jsonContent(),
                    invocation.actualModelUsed(),
                    invocation.actualTier(),
                    decision.routingReason(),
                    fallback
            );
            if (parsedOpt.isPresent()) {
                result = parsedOpt.get();
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeChatResponse chatWithKnowledgeBase(UUID eventId, KnowledgeChatRequest request) {
        RagPromptPackage ragPackage = contextRetriever.buildRagChatPackage(
                eventId,
                request.seriesId(),
                request.message()
        );
        List<EventFeedback> activeFeedbacks = ragPackage.bundle().currentFeedbacks().isEmpty()
                ? ragPackage.bundle().seriesFeedbacks()
                : ragPackage.bundle().currentFeedbacks();
        double avgRating = activeFeedbacks.stream()
                .filter(fb -> fb.getRatingScore() != null)
                .mapToInt(EventFeedback::getRatingScore)
                .average()
                .orElse(0.0);
        FeedbackInsights feedbackInsights = contextRetriever.extractFeedbackInsights(activeFeedbacks, avgRating);

        AiModelDecision decision = modelRouter.routeKnowledgeChat(request.message());
        KnowledgeChatResponse fallback = heuristicEngine.buildChatResponse(
                request,
                ragPackage.bundle(),
                feedbackInsights,
                decision
        );

        String systemPrompt = KnowledgePromptLibrary.ragChatSystemPrompt();
        Optional<LlmInvocationResult> llmOpt = llmGateway.invokeWithMetadata(
                decision,
                systemPrompt,
                ragPackage.promptText(),
                request.history()
        );
        KnowledgeChatResponse result = fallback;
        if (llmOpt.isPresent()) {
            LlmInvocationResult invocation = llmOpt.get();
            Optional<KnowledgeChatResponse> parsedOpt = parseChatJson(
                    invocation.jsonContent(),
                    invocation.actualModelUsed(),
                    invocation.actualTier(),
                    decision.routingReason(),
                    ragPackage.citationRegistry(),
                    fallback
            );
            if (parsedOpt.isPresent()) {
                result = parsedOpt.get();
            }
        }
        return result;
    }

    private ResolvedFeedbackReport resolveCloudOrFallbackFeedbackDraft(
            AiModelDecision decision,
            String feedbackContext,
            HeuristicFeedbackDraft fallbackDraft
    ) {
        ResolvedFeedbackReport chosen = new ResolvedFeedbackReport(
                fallbackDraft,
                LocalHeuristicAiEngine.MODEL_NAME,
                AiModelRouter.TIER_HEURISTIC,
                decision.routingReason() + " (Chế độ nội bộ Heuristic)"
        );

        String systemPrompt = KnowledgePromptLibrary.feedbackReportSystemPrompt();
        Optional<LlmInvocationResult> llmOpt = llmGateway.invokeWithMetadata(
                decision,
                systemPrompt,
                feedbackContext,
                Collections.emptyList()
        );
        if (llmOpt.isPresent()) {
            LlmInvocationResult invocation = llmOpt.get();
            try {
                JsonNode root = objectMapper.readTree(invocation.jsonContent());
                String summary = root.path("executiveSummary").asText(fallbackDraft.executiveSummary());
                List<String> highlights = readStringList(root.path("topHighlights"), fallbackDraft.topHighlights());
                List<String> improvements = readStringList(root.path("topImprovements"), fallbackDraft.topImprovements());
                List<DepartmentActionItem> deptActions = readDeptActions(
                        root.path("departmentActions"),
                        fallbackDraft.departmentActions()
                );
                List<SuggestedIncidentItem> incDrafts = readSuggestedIncidents(
                        root.path("suggestedIncidents"),
                        fallbackDraft.incidentDrafts()
                );

                HeuristicFeedbackDraft llmDraft = new HeuristicFeedbackDraft(
                        summary,
                        fallbackDraft.sentimentMap(),
                        highlights,
                        improvements,
                        deptActions,
                        incDrafts
                );
                chosen = new ResolvedFeedbackReport(
                        llmDraft,
                        invocation.actualModelUsed(),
                        invocation.actualTier(),
                        decision.routingReason()
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
            String modelUsed,
            String modelTier,
            String routingReason
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
                            modelUsed,
                            modelTier,
                            routingReason,
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
            String modelUsed,
            String modelTier,
            String routingReason,
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
                    modelUsed,
                    modelTier,
                    routingReason
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
            String modelUsed,
            String modelTier,
            String routingReason,
            Map<String, CitationItem> citationRegistry,
            KnowledgeChatResponse fallback
    ) {
        Optional<KnowledgeChatResponse> result = Optional.empty();
        try {
            JsonNode root = objectMapper.readTree(json);
            String answer = root.path("answer").asText("").trim();
            if (!answer.isEmpty()) {
                List<CitationItem> citations = resolveRealCitations(
                        root.path("citationIds"),
                        citationRegistry,
                        fallback.citations()
                );
                List<String> followUps = readStringList(
                        root.path("followUpQuestions"),
                        fallback.followUpQuestions()
                );
                result = Optional.of(new KnowledgeChatResponse(
                        answer,
                        modelUsed,
                        modelTier,
                        routingReason,
                        citations,
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

    private List<CitationItem> resolveRealCitations(
            JsonNode citationIdsNode,
            Map<String, CitationItem> registry,
            List<CitationItem> fallbackCitations
    ) {
        List<CitationItem> resolved = new ArrayList<>();
        if (citationIdsNode != null && citationIdsNode.isArray()) {
            Set<String> seenIds = new LinkedHashSet<>();
            for (JsonNode idNode : citationIdsNode) {
                String refId = idNode.asText("").trim().toUpperCase(Locale.ROOT);
                if (!refId.isEmpty() && seenIds.add(refId) && registry.containsKey(refId)) {
                    resolved.add(registry.get(refId));
                }
            }
        }
        return resolved.isEmpty() ? fallbackCitations : resolved;
    }

    private List<SuggestedIncidentItem> readSuggestedIncidents(
            JsonNode node,
            List<SuggestedIncidentItem> fallbackItems
    ) {
        List<SuggestedIncidentItem> result = fallbackItems;
        if (node != null && node.isArray()) {
            List<SuggestedIncidentItem> parsed = new ArrayList<>();
            for (JsonNode item : node) {
                Optional<SuggestedIncidentItem> incOpt = toSuggestedIncidentItem(item);
                incOpt.ifPresent(parsed::add);
            }
            if (!parsed.isEmpty() || node.isEmpty()) {
                result = parsed;
            }
        }
        return result;
    }

    private Optional<SuggestedIncidentItem> toSuggestedIncidentItem(JsonNode item) {
        Optional<SuggestedIncidentItem> result = Optional.empty();
        String title = item.path(KEY_TITLE).asText("").trim();
        String lesson = item.path(KEY_LESSON).asText("").trim();
        if (!title.isEmpty() && !lesson.isEmpty()) {
            IncidentSeverity sev = parseSeverity(item.path(KEY_SEVERITY).asText(""), IncidentSeverity.MEDIUM);
            List<String> depts = parseDepartments(item.path(KEY_DEPTS), List.of(Department.PLAN)).stream()
                    .map(Enum::name)
                    .toList();
            result = Optional.of(new SuggestedIncidentItem(
                    title,
                    sev.name(),
                    depts,
                    item.path(KEY_DESC).asText(title).trim(),
                    item.path(KEY_ROOT_CAUSE).asText("Cần rà soát quy trình vận hành liên quan.").trim(),
                    item.path(KEY_SOLUTION).asText("Điều phối nhân sự xử lý trực tiếp tại hiện trường.").trim(),
                    lesson
            ));
        }
        return result;
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
                                    String.valueOf(row.getOrDefault(KEY_SEVERITY, DEFAULT_MEDIUM)),
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
