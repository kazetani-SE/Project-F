package com.projectf.features.knowledge.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.features.knowledge.ai.AiModelDecision;
import com.projectf.features.knowledge.ai.AiModelRouter;
import com.projectf.features.knowledge.ai.LlmGateway;
import com.projectf.features.knowledge.ai.LocalHeuristicAiEngine;
import com.projectf.features.knowledge.dto.request.DraftIncidentAiRequest;
import com.projectf.features.knowledge.dto.request.GenerateFaqSuggestionsRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest;
import com.projectf.features.knowledge.dto.response.DraftIncidentAiResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionsResultResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.entity.EventFeedbackAiReport;
import com.projectf.features.knowledge.repository.FaqRepository;
import com.projectf.features.knowledge.repository.FeedbackAiReportRepository;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.repository.IncidentRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KnowledgeAiServiceImplTest {

    @Mock
    private FeedbackRepository feedbackRepo;

    @Mock
    private FeedbackAiReportRepository reportRepo;

    @Mock
    private FaqRepository faqRepo;

    @Mock
    private IncidentRepository incidentRepo;

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
        LocalHeuristicAiEngine heuristicEngine = new LocalHeuristicAiEngine();
        aiService = new KnowledgeAiServiceImpl(
                feedbackRepo,
                reportRepo,
                faqRepo,
                incidentRepo,
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
    void shouldGenerateAndPersistFreshFeedbackReport() {
        UUID eventId = UUID.randomUUID();
        EventFeedback fb = new EventFeedback();
        fb.setRatingScore(5);
        fb.setHighlightContent("Diễn giả chia sẻ rất thực tế và cuốn hút");
        fb.setImproveContent("Cần mở thêm bàn check-in để đỡ chờ lâu");
        fb.setSubmittedAt(OffsetDateTime.now());

        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(List.of(fb));
        when(reportRepo.findByEventId(eventId)).thenReturn(Optional.empty());
        when(llmGateway.invokeStructuredJson(any(), any(), any())).thenReturn(Optional.empty());
        when(reportRepo.save(any(EventFeedbackAiReport.class))).thenAnswer(inv -> {
            EventFeedbackAiReport ent = inv.getArgument(0);
            ent.setId(UUID.randomUUID());
            return ent;
        });

        FeedbackAiReportResponse generated = aiService.generateFeedbackReport(eventId);
        assertNotNull(generated);
        assertFalse(generated.isStale());
        assertEquals(1, generated.fbCountSnap());
        assertEquals(0, generated.newFbDelta());
        assertFalse(generated.topHighlights().isEmpty());
        assertFalse(generated.departmentActions().isEmpty());
    }

    @Test
    void shouldSuggestFaqQuestionsAndDraftIncidentAndChat() {
        UUID seriesId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();

        when(faqRepo.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(seriesId)).thenReturn(Collections.emptyList());
        when(incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId)).thenReturn(Collections.emptyList());
        when(feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId)).thenReturn(Collections.emptyList());
        when(llmGateway.invokeStructuredJson(any(), any(), any())).thenReturn(Optional.empty());

        FaqSuggestionsResultResponse faqRes = aiService.suggestFaqQuestions(
                seriesId,
                new GenerateFaqSuggestionsRequest(eventId, "Hậu cần", 4)
        );
        assertEquals(4, faqRes.suggestions().size());

        DraftIncidentAiResponse draftRes = aiService.draftIncidentPostMortem(
                eventId,
                new DraftIncidentAiRequest("Micro không dây bị hú và trễ timeline 15 phút", "Tech Event")
        );
        assertNotNull(draftRes.rootCause());
        assertNotNull(draftRes.lessonLearned());

        KnowledgeChatResponse chatRes = aiService.chatWithKnowledgeBase(
                eventId,
                new KnowledgeChatRequest(seriesId, "Tóm tắt bài học kinh nghiệm mùa này?", Collections.emptyList())
        );
        assertNotNull(chatRes.answer());
        assertFalse(chatRes.followUpQuestions().isEmpty());
    }
}
