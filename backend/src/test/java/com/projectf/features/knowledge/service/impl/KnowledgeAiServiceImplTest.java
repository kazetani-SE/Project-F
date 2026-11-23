package com.projectf.features.knowledge.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import com.projectf.features.document.entity.EventDocument;
import com.projectf.features.document.repository.DocumentRepository;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.finance.repository.EventBudgetSummaryViewRepository;
import com.projectf.features.knowledge.ai.AiModelDecision;
import com.projectf.features.knowledge.ai.AiModelRouter;
import com.projectf.features.knowledge.ai.KnowledgeContextRetriever;
import com.projectf.features.knowledge.ai.LlmGateway;
import com.projectf.features.knowledge.ai.LlmGateway.LlmInvocationResult;
import com.projectf.features.knowledge.ai.LocalHeuristicAiEngine;
import com.projectf.features.knowledge.dto.request.DraftIncidentAiRequest;
import com.projectf.features.knowledge.dto.request.GenerateFaqSuggestionsRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest.ChatTurnItem;
import com.projectf.features.knowledge.dto.response.DraftIncidentAiResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionsResultResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.entity.EventFeedbackAiReport;
import com.projectf.features.knowledge.entity.EventIncident;
import com.projectf.features.knowledge.repository.FaqRepository;
import com.projectf.features.knowledge.repository.FeedbackAiReportRepository;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.repository.IncidentRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KnowledgeAiServiceImplTest {

    @Mock
    private EventRepository eventRepo;

    @Mock
    private FeedbackRepository feedbackRepo;

    @Mock
    private FeedbackAiReportRepository reportRepo;

    @Mock
    private FaqRepository faqRepo;

    @Mock
    private IncidentRepository incidentRepo;

    @Mock
    private DocumentRepository documentRepo;

    @Mock
    private EventBudgetSummaryViewRepository budgetSummaryRepo;

    @Mock
    private LlmGateway llmGateway;

    private AiModelRouter modelRouter;
    private KnowledgeAiServiceImpl aiService;

    @BeforeEach
    void setUp() {
        modelRouter = new AiModelRouter(
                "bedrock",
                "anthropic.claude-3-haiku-20240307-v1:0",
                "anthropic.claude-3-5-sonnet-20240620-v1:0",
                "gemini-3.5-flash-lite",
                "gemini-3.5-flash"
        );
        KnowledgeContextRetriever retriever = new KnowledgeContextRetriever(
                eventRepo,
                incidentRepo,
                feedbackRepo,
                reportRepo,
                faqRepo,
                documentRepo,
                budgetSummaryRepo
        );
        LocalHeuristicAiEngine heuristicEngine = new LocalHeuristicAiEngine();
        aiService = new KnowledgeAiServiceImpl(
                feedbackRepo,
                reportRepo,
                faqRepo,
                incidentRepo,
                retriever,
                modelRouter,
                llmGateway,
                heuristicEngine,
                new ObjectMapper()
        );
    }

    @Test
    void shouldRouteSimpleVsComplexTasksCorrectly() {
        AiModelDecision fastChat = modelRouter.routeKnowledgeChat("Phí tham dự là bao nhiêu?");
        assertEquals(AiModelRouter.TIER_FAST, fastChat.tier());
        assertEquals("anthropic.claude-3-haiku-20240307-v1:0", fastChat.modelId());

        AiModelDecision deepChat = modelRouter.routeKnowledgeChat(
                "Hãy phân tích nguyên nhân gốc rễ các sự cố và đề xuất chiến lược khắc phục đa mùa"
        );
        assertEquals(AiModelRouter.TIER_DEEP, deepChat.tier());
        assertEquals("anthropic.claude-3-5-sonnet-20240620-v1:0", deepChat.modelId());

        AiModelDecision fastReport = modelRouter.routeFeedbackReport(10, 500);
        assertEquals(AiModelRouter.TIER_FAST, fastReport.tier());

        AiModelDecision deepReport = modelRouter.routeFeedbackReport(30, 1200);
        assertEquals(AiModelRouter.TIER_DEEP, deepReport.tier());
    }

    @Test
    void shouldDetectStaleFeedbackReportWhenNewFeedbacksArrive() {
        UUID eventId = UUID.randomUUID();
        OffsetDateTime snapshotTime = OffsetDateTime.now().minusHours(2);

        EventFeedbackAiReport savedEntity = new EventFeedbackAiReport();
        savedEntity.setId(UUID.randomUUID());
        savedEntity.setEventId(eventId);
        savedEntity.setModelUsed("anthropic.claude-3-haiku-20240307-v1:0");
        savedEntity.setModelTier("FAST");
        savedEntity.setFbCountSnap(1);
        savedEntity.setLatestFbAtSnap(snapshotTime);
        savedEntity.setAvgRatingSnap(BigDecimal.valueOf(4.5));
        savedEntity.setExecutiveSummary("Báo cáo đã lưu");

        EventFeedback fb1 = new EventFeedback();
        fb1.setRatingScore(5);
        fb1.setSubmittedAt(snapshotTime.plusMinutes(30));

        EventFeedback fb2 = new EventFeedback();
        fb2.setRatingScore(4);
        fb2.setSubmittedAt(snapshotTime);

        when(reportRepo.findByEventId(eventId)).thenReturn(Optional.of(savedEntity));
        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(List.of(fb1, fb2));

        Optional<FeedbackAiReportResponse> resOpt = aiService.getSavedFeedbackReport(eventId);
        assertTrue(resOpt.isPresent());
        FeedbackAiReportResponse report = resOpt.get();
        assertTrue(report.isStale());
        assertEquals(1, report.fbCountSnap());
        assertEquals(2, report.currentFbCount());
        assertEquals(1, report.newFbDelta());
    }

    @Test
    void shouldGenerateFeedbackReportWithCustomResponsesAndAccurateHeuristicTier() {
        UUID eventId = UUID.randomUUID();
        EventFeedback fb = new EventFeedback();
        fb.setRatingScore(4);
        fb.setSourceType("ATTENDEE");
        fb.setCustomResponses(Map.of(
                "ratings", List.of(Map.of("question", "Chất lượng âm thanh", "score", 3, "scaleMax", 5)),
                "suggestions", List.of(Map.of("question", "Góp ý cải thiện", "answer", "Micro hội trường bị rè phần đầu"))
        ));
        fb.setSubmittedAt(OffsetDateTime.now());

        when(eventRepo.findById(eventId)).thenReturn(Optional.empty());
        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(List.of(fb));
        when(reportRepo.findByEventId(eventId)).thenReturn(Optional.empty());
        when(llmGateway.invokeWithMetadata(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(reportRepo.save(any(EventFeedbackAiReport.class))).thenAnswer(inv -> {
            EventFeedbackAiReport ent = inv.getArgument(0);
            ent.setId(UUID.randomUUID());
            return ent;
        });

        FeedbackAiReportResponse generated = aiService.generateFeedbackReport(eventId);
        assertNotNull(generated);
        assertFalse(generated.isStale());
        assertEquals(AiModelRouter.TIER_HEURISTIC, generated.modelTier());
        assertEquals(LocalHeuristicAiEngine.MODEL_NAME, generated.modelUsed());
        assertEquals(1, generated.fbCountSnap());
        assertTrue(generated.topImprovements().stream().anyMatch(item -> item.contains("Micro hội trường")));

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmGateway).invokeWithMetadata(any(), any(), promptCaptor.capture(), any());
        assertTrue(promptCaptor.getValue().contains("Chất lượng âm thanh"));
        assertTrue(promptCaptor.getValue().contains("Micro hội trường bị rè phần đầu"));
    }

    @Test
    void shouldUseMultiSeasonContextHistoryAndRealCitationsInChat() {
        UUID seriesId = UUID.randomUUID();
        UUID currentEventId = UUID.randomUUID();
        UUID prevEventId = UUID.randomUUID();

        Event currentEv = new Event();
        currentEv.setId(currentEventId);
        currentEv.setSeriesId(seriesId);
        currentEv.setTitle("Tech Camp 2026");
        currentEv.setSeasonName("Fall 2026");
        currentEv.setExpectedStartDate(LocalDate.of(2026, 11, 20));
        currentEv.setExpectedEndDate(LocalDate.of(2026, 11, 21));

        Event prevEv = new Event();
        prevEv.setId(prevEventId);
        prevEv.setSeriesId(seriesId);
        prevEv.setTitle("Tech Camp 2025");
        prevEv.setSeasonName("Fall 2025");
        prevEv.setExpectedStartDate(LocalDate.of(2025, 11, 20));
        prevEv.setExpectedEndDate(LocalDate.of(2025, 11, 21));

        EventIncident prevInc = new EventIncident();
        prevInc.setEventId(prevEventId);
        prevInc.setTitle("Trễ khai mạc do ùn tắc bàn check-in");
        prevInc.setSeverity(IncidentSeverity.HIGH);
        prevInc.setDepartments(List.of(Department.PLAN, Department.HR));
        prevInc.setDescription("Hàng dài sinh viên chờ 25 phút");
        prevInc.setRootCause("Chỉ bố trí 1 bàn check-in cho 300 người");
        prevInc.setImmediateSolution("Mở thêm 2 làn check-in phụ");
        prevInc.setLessonLearned("Bố trí tối thiểu 3 bàn check-in trước giờ G 45 phút");

        EventDocument approvedDoc = new EventDocument();
        approvedDoc.setEventId(currentEventId);
        approvedDoc.setDocType("RUNNING_ORDER");
        approvedDoc.setTitle("Running Order Tech Camp 2026");
        approvedDoc.setVersion("2.0");
        approvedDoc.setStatus(ApprovalStatus.APPROVED);

        when(eventRepo.findById(currentEventId)).thenReturn(Optional.of(currentEv));
        when(eventRepo.findBySeriesIdOrderByExpectedStartDateDesc(seriesId)).thenReturn(List.of(currentEv, prevEv));
        when(incidentRepo.findByEventIdInOrderByCreatedAtDesc(any())).thenReturn(List.of(prevInc));
        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(currentEventId)).thenReturn(Collections.emptyList());
        when(feedbackRepo.findByEventIdInOrderBySubmittedAtDesc(any())).thenReturn(Collections.emptyList());
        when(faqRepo.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(seriesId)).thenReturn(Collections.emptyList());
        when(reportRepo.findByEventId(currentEventId)).thenReturn(Optional.empty());
        when(documentRepo.findByEventIdOrderByCreatedAtDesc(currentEventId)).thenReturn(List.of(approvedDoc));
        when(budgetSummaryRepo.findById(currentEventId)).thenReturn(Optional.empty());

        List<ChatTurnItem> history = List.of(
                new ChatTurnItem("user", "Mùa trước có vấn đề gì không?"),
                new ChatTurnItem("assistant", "Mùa trước bị trễ khai mạc do check-in.")
        );

        String mockLlmJson = """
                {
                  "answer": "Từ mùa Fall 2025, sự cố chính là **ùn tắc bàn check-in**. Bài học là mở tối thiểu 3 bàn trước giờ G 45 phút.",
                  "citationIds": ["INC-1", "DOC-1"],
                  "followUpQuestions": ["Running Order mùa 2026 hiện đang ở phiên bản nào?"]
                }
                """;
        when(llmGateway.invokeWithMetadata(any(), any(), any(), eq(history)))
                .thenReturn(Optional.of(new LlmInvocationResult(mockLlmJson, "gemini-3.5-flash", "DEEP")));

        KnowledgeChatResponse chatRes = aiService.chatWithKnowledgeBase(
                currentEventId,
                new KnowledgeChatRequest(seriesId, "Phân tích kỹ hơn bài học từ sự cố mùa trước?", history)
        );

        assertEquals("DEEP", chatRes.modelTier());
        assertEquals("gemini-3.5-flash", chatRes.modelUsed());
        assertEquals(2, chatRes.citations().size());
        assertEquals("INCIDENT", chatRes.citations().get(0).sourceType());
        assertEquals("DOCUMENT", chatRes.citations().get(1).sourceType());
        assertTrue(chatRes.citations().get(0).title().contains("Fall 2025"));

        ArgumentCaptor<String> ragPromptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmGateway).invokeWithMetadata(any(), any(), ragPromptCaptor.capture(), eq(history));
        assertTrue(ragPromptCaptor.getValue().contains("Trễ khai mạc do ùn tắc bàn check-in"));
        assertTrue(ragPromptCaptor.getValue().contains("Running Order Tech Camp 2026"));
    }

    @Test
    void shouldSuggestFaqQuestionsAndDraftIncidentWithFallback() {
        UUID seriesId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();

        when(eventRepo.findById(eventId)).thenReturn(Optional.empty());
        when(eventRepo.findBySeriesIdOrderByExpectedStartDateDesc(seriesId)).thenReturn(Collections.emptyList());
        when(faqRepo.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(seriesId)).thenReturn(Collections.emptyList());
        when(incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId)).thenReturn(Collections.emptyList());
        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(Collections.emptyList());
        when(reportRepo.findByEventId(eventId)).thenReturn(Optional.empty());
        when(documentRepo.findByEventIdOrderByCreatedAtDesc(eventId)).thenReturn(Collections.emptyList());
        when(budgetSummaryRepo.findById(eventId)).thenReturn(Optional.empty());
        when(llmGateway.invokeWithMetadata(any(), any(), any(), any())).thenReturn(Optional.empty());

        FaqSuggestionsResultResponse faqRes = aiService.suggestFaqQuestions(
                seriesId,
                new GenerateFaqSuggestionsRequest(eventId, "Hậu cần", 4)
        );
        assertEquals(4, faqRes.suggestions().size());
        assertEquals(AiModelRouter.TIER_HEURISTIC, faqRes.modelTier());

        DraftIncidentAiResponse draftRes = aiService.draftIncidentPostMortem(
                eventId,
                new DraftIncidentAiRequest("Micro không dây bị hú và trễ timeline 15 phút", "Tech Event")
        );
        assertNotNull(draftRes.rootCause());
        assertNotNull(draftRes.lessonLearned());
        assertEquals(AiModelRouter.TIER_HEURISTIC, draftRes.modelTier());
    }
}
