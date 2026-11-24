package com.projectf.features.knowledge.ai;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.document.entity.EventDocument;
import com.projectf.features.document.repository.DocumentRepository;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.finance.entity.EventBudgetSummaryView;
import com.projectf.features.finance.repository.EventBudgetSummaryViewRepository;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse.CitationItem;
import com.projectf.features.knowledge.entity.EventFaq;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.entity.EventFeedbackAiReport;
import com.projectf.features.knowledge.entity.EventIncident;
import com.projectf.features.knowledge.repository.FaqRepository;
import com.projectf.features.knowledge.repository.FeedbackAiReportRepository;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.repository.IncidentRepository;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class KnowledgeContextRetriever {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern TOKEN_SPLIT = Pattern.compile("[^\\p{L}\\p{Nd}]+");
    private static final String SEP_PIPE = " | ";
    private static final String KEY_RATINGS = "ratings";
    private static final String KEY_SUGGESTIONS = "suggestions";
    private static final String KEY_QUESTION = "question";
    private static final String KEY_ANSWER = "answer";
    private static final String KEY_SCORE = "score";
    private static final String KEY_SCALE_MAX = "scaleMax";
    private static final String KEY_METADATA = "metadata";
    private static final String TYPE_FAQ = "FAQ";
    private static final String TYPE_INCIDENT = "INCIDENT";
    private static final String TYPE_FEEDBACK = "FEEDBACK";
    private static final String TYPE_DOCUMENT = "DOCUMENT";
    private static final String TYPE_FINANCE = "FINANCE";
    private static final String TYPE_POLICY = "POLICY";
    private static final int MIN_TEXT_LEN = 4;
    private static final int MAX_RATING_NOTES = 4;
    private static final int MIN_TOKEN_LEN = 2;
    private static final double MIN_SCORE = 0.0;

    private static final Map<String, List<String>> DOMAIN_SYNONYMS = Map.of(
            "duyet", List.of("phe", "approve", "quyen", "rbac", "phu", "trach"),
            "chi", List.of("phi", "tien", "ngan", "sach", "hoa", "don", "budget", "expense"),
            "su", List.of("co", "incident", "post", "mortem", "loi", "rui", "ro", "bai", "hoc"),
            "khao", List.of("sat", "feedback", "danh", "gia", "gop", "diem", "sao"),
            "tai", List.of("lieu", "document", "plan", "running", "order", "ke", "hoach"),
            "faq", List.of("hoi", "dap", "quy", "dinh", "the", "le", "tham", "gia")
    );

    private final EventRepository eventRepo;
    private final IncidentRepository incidentRepo;
    private final FeedbackRepository feedbackRepo;
    private final FeedbackAiReportRepository reportRepo;
    private final FaqRepository faqRepo;
    private final DocumentRepository documentRepo;
    private final EventBudgetSummaryViewRepository budgetSummaryRepo;

    public KnowledgeContextRetriever(
            EventRepository eventRepo,
            IncidentRepository incidentRepo,
            FeedbackRepository feedbackRepo,
            FeedbackAiReportRepository reportRepo,
            FaqRepository faqRepo,
            DocumentRepository documentRepo,
            EventBudgetSummaryViewRepository budgetSummaryRepo
    ) {
        this.eventRepo = eventRepo;
        this.incidentRepo = incidentRepo;
        this.feedbackRepo = feedbackRepo;
        this.reportRepo = reportRepo;
        this.faqRepo = faqRepo;
        this.documentRepo = documentRepo;
        this.budgetSummaryRepo = budgetSummaryRepo;
    }

    public record MultiSeasonBundle(
            Optional<Event> currentEvent,
            UUID resolvedSeriesId,
            Map<UUID, String> seasonLabels,
            List<EventFaq> faqs,
            List<EventIncident> incidents,
            List<EventFeedback> currentFeedbacks,
            List<EventFeedback> seriesFeedbacks,
            Optional<EventFeedbackAiReport> savedReport,
            List<EventDocument> approvedDocuments,
            Optional<EventBudgetSummaryView> budgetSummary
    ) {
    }

    public record RagPromptPackage(
            String promptText,
            Map<String, CitationItem> citationRegistry,
            MultiSeasonBundle bundle
    ) {
    }

    public record FeedbackInsights(
            double avgRating,
            Map<String, String> criterionAverages,
            List<String> highlights,
            List<String> improvements,
            List<String> suggestions
    ) {
    }

    public MultiSeasonBundle loadMultiSeasonBundle(UUID eventId, UUID requestedSeriesId) {
        Optional<Event> currentEventOpt = eventRepo.findById(eventId);
        UUID resolvedSeriesId = currentEventOpt
                .map(Event::getSeriesId)
                .orElse(requestedSeriesId);

        Map<UUID, String> seasonLabels = new LinkedHashMap<>();
        List<UUID> seriesEventIds = new ArrayList<>();
        seriesEventIds.add(eventId);

        currentEventOpt.ifPresent(ev -> seasonLabels.put(ev.getId(), formatSeasonLabel(ev, true)));

        if (resolvedSeriesId != null) {
            List<Event> siblingEvents = eventRepo.findBySeriesIdOrderByExpectedStartDateDesc(resolvedSeriesId);
            for (Event ev : siblingEvents) {
                boolean isCurrent = eventId.equals(ev.getId());
                seasonLabels.put(ev.getId(), formatSeasonLabel(ev, isCurrent));
                if (!seriesEventIds.contains(ev.getId())) {
                    seriesEventIds.add(ev.getId());
                }
            }
        }

        List<EventIncident> incidents = seriesEventIds.size() > 1
                ? incidentRepo.findByEventIdInOrderByCreatedAtDesc(seriesEventIds)
                : incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId);

        List<EventFeedback> currentFeedbacks = feedbackRepo.findByEventIdOrderBySubmittedAtDesc(eventId);
        List<EventFeedback> seriesFeedbacks = seriesEventIds.size() > 1
                ? feedbackRepo.findByEventIdInOrderBySubmittedAtDesc(seriesEventIds)
                : currentFeedbacks;

        List<EventFaq> faqs = resolvedSeriesId != null
                ? faqRepo.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(resolvedSeriesId)
                : faqRepo.findAll();

        Optional<EventFeedbackAiReport> savedReport = reportRepo.findByEventId(eventId);
        List<EventDocument> approvedDocs = documentRepo.findByEventIdOrderByCreatedAtDesc(eventId).stream()
                .filter(doc -> ApprovalStatus.APPROVED.equals(doc.getStatus()))
                .toList();
        Optional<EventBudgetSummaryView> budgetSummary = budgetSummaryRepo.findById(eventId);

        return new MultiSeasonBundle(
                currentEventOpt,
                resolvedSeriesId,
                seasonLabels,
                faqs,
                incidents,
                currentFeedbacks,
                seriesFeedbacks,
                savedReport,
                approvedDocs,
                budgetSummary
        );
    }

    public RagPromptPackage buildRagChatPackage(UUID eventId, UUID requestedSeriesId, String userQuestion) {
        MultiSeasonBundle bundle = loadMultiSeasonBundle(eventId, requestedSeriesId);
        Map<String, CitationItem> registry = new LinkedHashMap<>();
        Set<String> queryTokens = expandQueryTokens(userQuestion);

        StringBuilder sb = new StringBuilder(2048);
        sb.append("Câu hỏi hiện tại của thành viên BTC: ").append(userQuestion).append("\n\n");

        appendEventMetadataSection(sb, bundle);
        appendFaqSection(sb, bundle.faqs(), queryTokens, registry);
        appendIncidentSection(sb, bundle.incidents(), bundle.seasonLabels(), queryTokens, registry);
        appendFeedbackSection(sb, bundle, queryTokens, registry);
        appendDocumentSection(sb, bundle.approvedDocuments(), registry);
        appendBudgetAndPolicySection(sb, bundle.budgetSummary(), registry);

        return new RagPromptPackage(sb.toString(), registry, bundle);
    }

    public String buildFeedbackReportContext(UUID eventId, List<EventFeedback> feedbacks, double avgRating) {
        Optional<Event> eventOpt = eventRepo.findById(eventId);
        FeedbackInsights insights = extractFeedbackInsights(feedbacks, avgRating);

        StringBuilder sb = new StringBuilder(2048);
        eventOpt.ifPresent(ev -> sb.append("Sự kiện: ").append(ev.getTitle())
                .append(" (Mùa: ").append(ev.getSeasonName()).append(")\n"));
        sb.append("Tổng số phiếu khảo sát: ").append(feedbacks.size())
                .append(SEP_PIPE).append("Điểm trung bình (thang 5): ")
                .append(String.format(Locale.US, "%.2f", avgRating))
                .append("/5.0\n");

        if (!insights.criterionAverages().isEmpty()) {
            sb.append("\n=== ĐIỂM TRUNG BÌNH THEO TỪNG TIÊU CHÍ (từ custom_responses.ratings) ===\n");
            for (Map.Entry<String, String> entry : insights.criterionAverages().entrySet()) {
                sb.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append('\n');
            }
        }

        sb.append("\n=== CHI TIẾT PHẢN HỒI NGƯỜI THAM DỰ ===\n");
        int limit = Math.min(feedbacks.size(), 50);
        for (int idx = 0; idx < limit; idx++) {
            EventFeedback fb = feedbacks.get(idx);
            sb.append(idx + 1).append(". [").append(fb.getSourceType())
                    .append(SEP_PIPE).append(fb.getRatingScore()).append("★] ");
            appendFeedbackBody(sb, fb);
            sb.append('\n');
        }
        return sb.toString();
    }

    public String buildFaqSuggestionContext(
            UUID seriesId,
            UUID eventId,
            String focusTopic,
            int requestedCount,
            List<EventFaq> existingFaqs
    ) {
        StringBuilder sb = new StringBuilder(1536);
        sb.append("Chủ đề trọng tâm yêu cầu: ")
                .append(focusTopic == null || focusTopic.isBlank() ? "Tổng hợp đa mục" : focusTopic.trim())
                .append("\nSố lượng câu hỏi cần sinh: ").append(requestedCount).append('\n');

        if (eventId != null) {
            MultiSeasonBundle bundle = loadMultiSeasonBundle(eventId, seriesId);
            bundle.currentEvent().ifPresent(ev -> {
                sb.append("Sự kiện: ").append(ev.getTitle()).append(" (Mùa: ").append(ev.getSeasonName()).append(")\n");
                if (ev.getDescription() != null && !ev.getDescription().isBlank()) {
                    sb.append("Mô tả sự kiện: ").append(truncate(ev.getDescription(), 350)).append('\n');
                }
            });

            if (!bundle.incidents().isEmpty()) {
                sb.append("\n=== SỰ CỐ ĐÃ GHI NHẬN (ưu tiên sinh FAQ phòng ngừa) ===\n");
                bundle.incidents().stream().limit(8).forEach(inc ->
                        sb.append("- [").append(inc.getSeverity()).append("] ").append(inc.getTitle())
                                .append(SEP_PIPE).append("Cách xử lý: ").append(truncate(inc.getImmediateSolution(), 180))
                                .append(SEP_PIPE).append("Bài học: ").append(truncate(inc.getLessonLearned(), 180)).append('\n')
                );
            }

            if (!bundle.seriesFeedbacks().isEmpty()) {
                FeedbackInsights insights = extractFeedbackInsights(
                        bundle.seriesFeedbacks(),
                        computeAverage(bundle.seriesFeedbacks())
                );
                if (!insights.improvements().isEmpty() || !insights.suggestions().isEmpty()) {
                    sb.append("\n=== GÓP Ý / THẮC MẮC TỪ FEEDBACK ===\n");
                    insights.improvements().stream().limit(8).forEach(item ->
                            sb.append("- Cần cải thiện: ").append(truncate(item, 180)).append('\n')
                    );
                    insights.suggestions().stream().limit(8).forEach(item ->
                            sb.append("- Góp ý chi tiết: ").append(truncate(item, 200)).append('\n')
                    );
                }
            }
        }

        sb.append("\n=== DANH SÁCH FAQ ĐÃ CÓ (TUYỆT ĐỐI KHÔNG TRÙNG Ý) ===\n");
        if (existingFaqs.isEmpty()) {
            sb.append("(Chưa có FAQ nào)\n");
        } else {
            existingFaqs.stream().limit(25).forEach(faq ->
                    sb.append("- [").append(faq.getCategory()).append("] ").append(faq.getQuestion()).append('\n')
            );
        }
        return sb.toString();
    }

    public String buildIncidentDraftContext(UUID eventId, String eventTitle, String briefObservation) {
        StringBuilder sb = new StringBuilder(1024);
        Optional<Event> eventOpt = eventRepo.findById(eventId);
        String resolvedTitle = eventTitle != null && !eventTitle.isBlank()
                ? eventTitle
                : eventOpt.map(Event::getTitle).orElse(eventId.toString());

        sb.append("Sự kiện: ").append(resolvedTitle).append('\n');
        eventOpt.ifPresent(ev -> {
            sb.append("Mùa: ").append(ev.getSeasonName()).append(SEP_PIPE)
                    .append("Trạng thái: ").append(ev.getStatus()).append('\n');
            if (ev.getDescription() != null && !ev.getDescription().isBlank()) {
                sb.append("Bối cảnh sự kiện: ").append(truncate(ev.getDescription(), 280)).append('\n');
            }
        });
        sb.append("\nMô tả hiện tượng ban đầu từ thành viên BTC:\n").append(briefObservation).append('\n');

        UUID seriesId = eventOpt.map(Event::getSeriesId).orElse(null);
        List<EventIncident> relatedIncidents = loadRelatedPastIncidents(eventId, seriesId, briefObservation);
        if (!relatedIncidents.isEmpty()) {
            sb.append("\n=== CÁC SỰ CỐ TƯƠNG TỰ ĐÃ TỪNG XẢY RA TRONG CHUỖI SỰ KIỆN ===\n");
            for (EventIncident inc : relatedIncidents) {
                sb.append("- [").append(inc.getSeverity()).append("] ").append(inc.getTitle())
                        .append(SEP_PIPE).append("Nguyên nhân cũ: ").append(truncate(inc.getRootCause(), 160))
                        .append(SEP_PIPE).append("Bài học cũ: ").append(truncate(inc.getLessonLearned(), 160)).append('\n');
            }
        }
        return sb.toString();
    }

    public FeedbackInsights extractFeedbackInsights(List<EventFeedback> feedbacks, double avgRating) {
        Map<String, List<double[]>> ratingBuckets = new LinkedHashMap<>();
        List<String> highlights = new ArrayList<>();
        List<String> improvements = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        for (EventFeedback fb : feedbacks) {
            if (fb.getHighlightContent() != null && !fb.getHighlightContent().isBlank()) {
                highlights.add(fb.getHighlightContent().trim());
            }
            if (fb.getImproveContent() != null && !fb.getImproveContent().isBlank()) {
                improvements.add(fb.getImproveContent().trim());
            }
            extractFromCustomResponses(fb.getCustomResponses(), ratingBuckets, suggestions);
        }

        Map<String, String> criterionAverages = new LinkedHashMap<>();
        for (Map.Entry<String, List<double[]>> entry : ratingBuckets.entrySet()) {
            double scoreSum = 0.0;
            double maxScale = 5.0;
            for (double[] pair : entry.getValue()) {
                scoreSum += pair[0];
                if (pair[1] > MIN_SCORE) {
                    maxScale = pair[1];
                }
            }
            double avg = entry.getValue().isEmpty() ? 0.0 : scoreSum / entry.getValue().size();
            criterionAverages.put(
                    entry.getKey(),
                    String.format(Locale.US, "%.2f/%.0f (%d lượt)", avg, maxScale, entry.getValue().size())
            );
        }

        return new FeedbackInsights(avgRating, criterionAverages, highlights, improvements, suggestions);
    }

    private List<EventIncident> loadRelatedPastIncidents(UUID eventId, UUID seriesId, String observation) {
        List<EventIncident> pool;
        if (seriesId != null) {
            List<UUID> ids = eventRepo.findBySeriesIdOrderByExpectedStartDateDesc(seriesId).stream()
                    .map(Event::getId)
                    .toList();
            pool = ids.isEmpty()
                    ? incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId)
                    : incidentRepo.findByEventIdInOrderByCreatedAtDesc(ids);
        } else {
            pool = incidentRepo.findByEventIdOrderByCreatedAtDesc(eventId);
        }

        Set<String> tokens = expandQueryTokens(observation);
        return rankByRelevance(
                pool,
                inc -> inc.getTitle() + ' ' + inc.getDescription() + ' ' + inc.getRootCause() + ' ' + inc.getLessonLearned(),
                tokens,
                3
        );
    }

    private void appendEventMetadataSection(StringBuilder sb, MultiSeasonBundle bundle) {
        sb.append("=== THÔNG TIN SỰ KIỆN & PHẠM VI ĐA MÙA ===\n");
        bundle.currentEvent().ifPresentOrElse(ev -> {
            sb.append("- Sự kiện hiện tại: ").append(ev.getTitle())
                    .append(SEP_PIPE).append("Mùa: ").append(ev.getSeasonName())
                    .append(SEP_PIPE).append("Trạng thái: ").append(ev.getStatus())
                    .append(SEP_PIPE).append("Thời gian dự kiến: ").append(ev.getExpectedStartDate())
                    .append(" đến ").append(ev.getExpectedEndDate()).append('\n');
            if (ev.getDescription() != null && !ev.getDescription().isBlank()) {
                sb.append("- Mô tả: ").append(truncate(ev.getDescription(), 400)).append('\n');
            }
        }, () -> sb.append("- Chưa có metadata chi tiết cho sự kiện hiện tại.\n"));

        sb.append("- Thống kê dữ liệu sẵn có: ")
                .append(bundle.faqs().size()).append(" FAQ, ")
                .append(bundle.incidents().size()).append(" sự cố Post-Mortem (trên ")
                .append(Math.max(1, bundle.seasonLabels().size())).append(" mùa), ")
                .append(bundle.currentFeedbacks().size()).append(" phiếu khảo sát mùa này (")
                .append(bundle.seriesFeedbacks().size()).append(" phiếu toàn chuỗi), ")
                .append(bundle.approvedDocuments().size()).append(" tài liệu đã duyệt.\n\n");
    }

    private void appendFaqSection(
            StringBuilder sb,
            List<EventFaq> faqs,
            Set<String> queryTokens,
            Map<String, CitationItem> registry
    ) {
        sb.append("=== DỮ LIỆU FAQ CHUỖI SỰ KIỆN ===\n");
        if (faqs.isEmpty()) {
            sb.append("(Hiện có 0 FAQ trong chuỗi sự kiện)\n\n");
        } else {
            List<EventFaq> rankedFaqs = rankFaqs(faqs, queryTokens, 10);
            for (int idx = 0; idx < rankedFaqs.size(); idx++) {
                EventFaq faq = rankedFaqs.get(idx);
                String refId = "FAQ-" + (idx + 1);
                sb.append('[').append(refId).append(']')
                        .append(Boolean.TRUE.equals(faq.getIsPinned()) ? " [GHIM]" : "")
                        .append(" [").append(faq.getCategory()).append("] Q: ")
                        .append(faq.getQuestion()).append(SEP_PIPE).append("A: ").append(faq.getAnswer()).append('\n');
                registerCitation(registry, refId, TYPE_FAQ, faq.getQuestion(), truncate(faq.getAnswer(), 180));
            }
            sb.append('\n');
        }
    }

    private void appendIncidentSection(
            StringBuilder sb,
            List<EventIncident> incidents,
            Map<UUID, String> seasonLabels,
            Set<String> queryTokens,
            Map<String, CitationItem> registry
    ) {
        sb.append("=== NHẬT KÝ SỰ CỐ & BÀI HỌC POST-MORTEM (ĐA MÙA) ===\n");
        if (incidents.isEmpty()) {
            sb.append("(Hiện có 0 sự cố Post-Mortem được ghi nhận)\n\n");
        } else {
            List<EventIncident> ranked = rankByRelevance(
                    incidents,
                    inc -> inc.getTitle() + ' ' + inc.getDescription() + ' ' + inc.getRootCause()
                            + ' ' + inc.getImmediateSolution() + ' ' + inc.getLessonLearned(),
                    queryTokens,
                    8
            );
            for (int idx = 0; idx < ranked.size(); idx++) {
                EventIncident inc = ranked.get(idx);
                String refId = "INC-" + (idx + 1);
                String season = seasonLabels.getOrDefault(inc.getEventId(), "Mùa sự kiện");
                sb.append('[').append(refId).append("] [").append(season).append(SEP_PIPE)
                        .append(inc.getSeverity()).append(SEP_PIPE).append("Ban: ").append(inc.getDepartments()).append("] ")
                        .append(inc.getTitle())
                        .append("\n  - Mô tả: ").append(truncate(inc.getDescription(), 200))
                        .append("\n  - Nguyên nhân gốc: ").append(truncate(inc.getRootCause(), 200))
                        .append("\n  - Xử lý tức thời: ").append(truncate(inc.getImmediateSolution(), 180))
                        .append("\n  - Bài học kế thừa: ").append(truncate(inc.getLessonLearned(), 220)).append('\n');
                registerCitation(
                        registry,
                        refId,
                        TYPE_INCIDENT,
                        "[" + season + "] " + inc.getTitle(),
                        truncate(inc.getLessonLearned(), 180)
                );
            }
            sb.append('\n');
        }
    }

    private void appendFeedbackSection(
            StringBuilder sb,
            MultiSeasonBundle bundle,
            Set<String> queryTokens,
            Map<String, CitationItem> registry
    ) {
        sb.append("=== DỮ LIỆU KHẢO SÁT & FEEDBACK CHI TIẾT ===\n");
        List<EventFeedback> sourceFeedbacks = bundle.currentFeedbacks().isEmpty()
                ? bundle.seriesFeedbacks()
                : bundle.currentFeedbacks();

        if (sourceFeedbacks.isEmpty()) {
            sb.append("(Hiện có 0 phiếu khảo sát)\n\n");
        } else {
            double avg = computeAverage(sourceFeedbacks);
            FeedbackInsights insights = extractFeedbackInsights(sourceFeedbacks, avg);
            String summarySnippet = String.format(
                    Locale.US,
                    "Điểm trung bình %.2f/5.0★ trên %d phiếu khảo sát mùa hiện tại (%d phiếu toàn chuỗi).",
                    avg,
                    bundle.currentFeedbacks().size(),
                    bundle.seriesFeedbacks().size()
            );

            sb.append("[FB-SUMMARY] ").append(summarySnippet).append('\n');
            registerCitation(registry, "FB-SUMMARY", TYPE_FEEDBACK, "Thống kê Khảo sát Sự kiện", summarySnippet);

            bundle.savedReport().ifPresent(report -> {
                sb.append("[FB-REPORT] Tóm tắt báo cáo AI đã lưu: ").append(report.getExecutiveSummary()).append('\n');
                if (report.getTopHighlights() != null && !report.getTopHighlights().isEmpty()) {
                    sb.append("  - Top điểm sáng: ").append(String.join("; ", report.getTopHighlights())).append('\n');
                }
                if (report.getTopImprovements() != null && !report.getTopImprovements().isEmpty()) {
                    sb.append("  - Top cần cải thiện: ").append(String.join("; ", report.getTopImprovements())).append('\n');
                }
                registerCitation(
                        registry,
                        "FB-REPORT",
                        TYPE_FEEDBACK,
                        "Báo cáo Tổng hợp Feedback AI",
                        truncate(report.getExecutiveSummary(), 180)
                );
            });

            if (!insights.criterionAverages().isEmpty()) {
                sb.append("Điểm theo từng tiêu chí khảo sát:\n");
                for (Map.Entry<String, String> entry : insights.criterionAverages().entrySet()) {
                    sb.append("  * ").append(entry.getKey()).append(": ").append(entry.getValue()).append('\n');
                }
            }

            List<EventFeedback> rankedFeedbacks = rankByRelevance(
                    sourceFeedbacks,
                    this::buildFeedbackSearchableText,
                    queryTokens,
                    12
            );
            StringBuilder bodyBuffer = new StringBuilder(256);
            for (int idx = 0; idx < rankedFeedbacks.size(); idx++) {
                EventFeedback fb = rankedFeedbacks.get(idx);
                String refId = "FB-" + (idx + 1);
                bodyBuffer.setLength(0);
                appendFeedbackBody(bodyBuffer, fb);
                String bodyStr = bodyBuffer.toString().trim();
                if (!bodyStr.isEmpty()) {
                    String season = bundle.seasonLabels().getOrDefault(fb.getEventId(), "Mùa hiện tại");
                    sb.append('[').append(refId).append("] [").append(season).append(SEP_PIPE)
                            .append(fb.getSourceType()).append(SEP_PIPE).append(fb.getRatingScore()).append("★] ")
                            .append(bodyStr).append('\n');
                    registerCitation(
                            registry,
                            refId,
                            TYPE_FEEDBACK,
                            "Phản hồi " + fb.getSourceType() + " (" + fb.getRatingScore() + "★)",
                            truncate(bodyStr, 180)
                    );
                }
            }
            sb.append('\n');
        }
    }

    private void appendDocumentSection(
            StringBuilder sb,
            List<EventDocument> approvedDocs,
            Map<String, CitationItem> registry
    ) {
        sb.append("=== TÀI LIỆU KẾ HOẠCH ĐÃ PHÊ DUYỆT ===\n");
        if (approvedDocs.isEmpty()) {
            sb.append("(Chưa có tài liệu nào ở trạng thái APPROVED)\n\n");
        } else {
            int limit = Math.min(approvedDocs.size(), 8);
            for (int idx = 0; idx < limit; idx++) {
                EventDocument doc = approvedDocs.get(idx);
                String refId = "DOC-" + (idx + 1);
                String snippet = "Loại: " + doc.getDocType() + SEP_PIPE + "Phiên bản: v" + doc.getVersion();
                sb.append('[').append(refId).append("] ").append(doc.getTitle())
                        .append(" (").append(snippet).append(")\n");
                registerCitation(registry, refId, TYPE_DOCUMENT, doc.getTitle(), snippet);
            }
            sb.append('\n');
        }
    }

    private void appendBudgetAndPolicySection(
            StringBuilder sb,
            Optional<EventBudgetSummaryView> budgetOpt,
            Map<String, CitationItem> registry
    ) {
        budgetOpt.ifPresent(summary -> {
            String snippet = "Quỹ cấp phát: " + formatVnd(summary.getAllocatedFund())
                    + SEP_PIPE + "Dự trù đã duyệt: " + formatVnd(summary.getTotalBudgetEst())
                    + SEP_PIPE + "Thực chi đã duyệt: " + formatVnd(summary.getTotalActualSpent())
                    + SEP_PIPE + "Quỹ còn lại: " + formatVnd(summary.getRemainingFund());
            sb.append("=== TỔNG QUAN NGÂN SÁCH SỰ KIỆN ===\n[FIN-1] ").append(snippet).append("\n\n");
            registerCitation(registry, "FIN-1", TYPE_FINANCE, "Tổng quan Ngân sách Sự kiện", snippet);
        });

        String rbacSummary = "Ban Chủ nhiệm CLB (PRESIDENT, VICEPRESIDENT): toàn quyền duyệt & phân công BTC. "
                + "LEAD_HEADER: quản trị sự kiện, duyệt tài liệu kế hoạch, quản lý FAQ/Feedback. "
                + "HR (BTC): duyệt ấn phẩm truyền thông, đối soát hóa đơn và duyệt dự trù/khoản chi của MEMBER. "
                + "PLAN: soạn/tải tài liệu kế hoạch và tự duyệt tài liệu của mình. "
                + "MEDIA: thiết kế/tải ấn phẩm (không tự duyệt). "
                + "MEMBER: lập dự trù & khoản chi kèm hóa đơn (bắt buộc >= 1 chứng từ, <= 15MB trước khi APPROVED).";
        sb.append("=== QUY CHẾ PHÂN QUYỀN & QUY TRÌNH CHUẨN PROJECT F ===\n[RBAC-1] ")
                .append(rbacSummary).append('\n');
        registerCitation(registry, "RBAC-1", TYPE_POLICY, "Quy chế Phân quyền & Duyệt chi Project F", rbacSummary);
    }

    private void registerCitation(
            Map<String, CitationItem> registry,
            String refId,
            String sourceType,
            String title,
            String snippet
    ) {
        registry.put(refId, new CitationItem(sourceType, title, snippet));
    }

    private void appendFeedbackBody(StringBuilder sb, EventFeedback fb) {
        if (fb.getHighlightContent() != null && !fb.getHighlightContent().isBlank()) {
            sb.append("Điểm tốt: ").append(fb.getHighlightContent().trim()).append("; ");
        }
        if (fb.getImproveContent() != null && !fb.getImproveContent().isBlank()) {
            sb.append("Cần cải thiện: ").append(fb.getImproveContent().trim()).append("; ");
        }
        List<String> customNotes = extractFeedbackCustomNotes(fb.getCustomResponses());
        if (!customNotes.isEmpty()) {
            sb.append("Chi tiết khảo sát: ").append(String.join(SEP_PIPE, customNotes));
        }
    }

    private String buildFeedbackSearchableText(EventFeedback fb) {
        StringBuilder sb = new StringBuilder(256);
        appendFeedbackBody(sb, fb);
        return sb.toString();
    }

    private void extractFromCustomResponses(
            Map<String, Object> customResponses,
            Map<String, List<double[]>> ratingBuckets,
            List<String> suggestions
    ) {
        if (customResponses != null && !customResponses.isEmpty()) {
            Object rawRatings = customResponses.get(KEY_RATINGS);
            if (rawRatings instanceof Collection<?> items) {
                for (Object item : items) {
                    collectRatingItem(item, ratingBuckets);
                }
            }

            Object rawSuggestions = customResponses.get(KEY_SUGGESTIONS);
            if (rawSuggestions instanceof Collection<?> items) {
                for (Object item : items) {
                    collectSuggestionItem(item, suggestions);
                }
            }

            for (Map.Entry<String, Object> entry : customResponses.entrySet()) {
                String key = entry.getKey();
                if (!key.startsWith("_")
                        && !KEY_RATINGS.equals(key)
                        && !KEY_SUGGESTIONS.equals(key)
                        && !KEY_METADATA.equals(key)
                        && entry.getValue() != null) {
                    String val = String.valueOf(entry.getValue()).trim();
                    if (val.length() >= MIN_TEXT_LEN) {
                        suggestions.add(key + ": " + val);
                    }
                }
            }
        }
    }

    private List<String> extractFeedbackCustomNotes(Map<String, Object> customResponses) {
        List<String> notes = new ArrayList<>();
        if (customResponses != null && !customResponses.isEmpty()) {
            Object rawSuggestions = customResponses.get(KEY_SUGGESTIONS);
            if (rawSuggestions instanceof Collection<?> items) {
                for (Object item : items) {
                    collectSuggestionItem(item, notes);
                }
            }
            Object rawRatings = customResponses.get(KEY_RATINGS);
            if (rawRatings instanceof Collection<?> items) {
                int count = 0;
                for (Object item : items) {
                    if (count >= MAX_RATING_NOTES) {
                        break;
                    }
                    String formatted = formatRatingNote(item);
                    if (!formatted.isEmpty()) {
                        notes.add(formatted);
                        count++;
                    }
                }
            }
            for (Map.Entry<String, Object> entry : customResponses.entrySet()) {
                String key = entry.getKey();
                if (!key.startsWith("_")
                        && !KEY_RATINGS.equals(key)
                        && !KEY_SUGGESTIONS.equals(key)
                        && !KEY_METADATA.equals(key)
                        && entry.getValue() != null) {
                    String val = String.valueOf(entry.getValue()).trim();
                    if (val.length() >= MIN_TEXT_LEN) {
                        notes.add(key + ": " + truncate(val, 120));
                    }
                }
            }
        }
        return notes;
    }

    private void collectRatingItem(Object rawItem, Map<String, List<double[]>> ratingBuckets) {
        if (rawItem instanceof Map<?, ?> map) {
            Object questionObj = map.get(KEY_QUESTION);
            Object scoreObj = map.get(KEY_SCORE);
            Object maxObj = map.get(KEY_SCALE_MAX);
            if (questionObj != null && scoreObj != null) {
                String question = String.valueOf(questionObj).trim();
                double score = parseDouble(scoreObj, -1.0);
                double scaleMax = parseDouble(maxObj, 5.0);
                if (!question.isEmpty() && score >= MIN_SCORE) {
                    ratingBuckets.computeIfAbsent(question, key -> new ArrayList<>())
                            .add(new double[]{score, scaleMax});
                }
            }
        }
    }

    private void collectSuggestionItem(Object rawItem, List<String> target) {
        if (rawItem instanceof Map<?, ?> map) {
            Object answerObj = map.get(KEY_ANSWER);
            Object questionObj = map.get(KEY_QUESTION);
            if (answerObj != null) {
                String answer = String.valueOf(answerObj).trim();
                if (!answer.isBlank() && !"-".equals(answer) && !"không".equalsIgnoreCase(answer)) {
                    String question = questionObj == null ? "" : String.valueOf(questionObj).trim();
                    String entry = question.isEmpty()
                            ? truncate(answer, 180)
                            : truncate(question, 70) + " -> " + truncate(answer, 160);
                    target.add(entry);
                }
            }
        }
    }

    private String formatRatingNote(Object rawItem) {
        String formatted = "";
        if (rawItem instanceof Map<?, ?> map) {
            Object questionObj = map.get(KEY_QUESTION);
            Object scoreObj = map.get(KEY_SCORE);
            Object maxObj = map.get(KEY_SCALE_MAX);
            if (questionObj != null && scoreObj != null) {
                double score = parseDouble(scoreObj, -1.0);
                double scaleMax = parseDouble(maxObj, 5.0);
                if (score >= MIN_SCORE) {
                    formatted = truncate(String.valueOf(questionObj).trim(), 55)
                            + "=" + String.format(Locale.US, "%.1f/%.0f", score, scaleMax);
                }
            }
        }
        return formatted;
    }

    private List<EventFaq> rankFaqs(List<EventFaq> faqs, Set<String> queryTokens, int limit) {
        List<ScoredItem<EventFaq>> scored = new ArrayList<>(faqs.size());
        for (int idx = 0; idx < faqs.size(); idx++) {
            EventFaq faq = faqs.get(idx);
            String text = faq.getCategory() + ' ' + faq.getQuestion() + ' ' + faq.getAnswer();
            double score = computeRelevanceScore(text, queryTokens)
                    + (Boolean.TRUE.equals(faq.getIsPinned()) ? 1.5 : 0.0)
                    - idx * 0.01;
            addScoredItem(scored, faq, score);
        }
        scored.sort(Comparator.comparingDouble(ScoredItem<EventFaq>::score).reversed());
        return scored.stream().limit(limit).map(ScoredItem::item).toList();
    }

    private <T> List<T> rankByRelevance(
            List<T> items,
            Function<T, String> textExtractor,
            Set<String> queryTokens,
            int limit
    ) {
        List<ScoredItem<T>> scored = new ArrayList<>(items.size());
        for (int idx = 0; idx < items.size(); idx++) {
            T item = items.get(idx);
            double score = computeRelevanceScore(textExtractor.apply(item), queryTokens) - idx * 0.02;
            addScoredItem(scored, item, score);
        }
        scored.sort(Comparator.comparingDouble(ScoredItem<T>::score).reversed());
        return scored.stream().limit(limit).map(ScoredItem::item).toList();
    }

    private <T> void addScoredItem(List<ScoredItem<T>> list, T item, double score) {
        list.add(new ScoredItem<>(item, score));
    }

    private double computeRelevanceScore(String targetText, Set<String> queryTokens) {
        double score = 0.0;
        if (targetText != null && !targetText.isBlank() && !queryTokens.isEmpty()) {
            Set<String> targetTokens = tokenizeNormalized(targetText);
            if (!targetTokens.isEmpty()) {
                int matches = 0;
                for (String token : queryTokens) {
                    if (targetTokens.contains(token)) {
                        matches++;
                    }
                }
                score = matches * 2.0 / Math.sqrt(targetTokens.size() + 3.0);
            }
        }
        return score;
    }

    private Set<String> expandQueryTokens(String query) {
        Set<String> base = tokenizeNormalized(query);
        Set<String> expanded = new LinkedHashSet<>(base);
        for (String token : base) {
            List<String> synonyms = DOMAIN_SYNONYMS.get(token);
            if (synonyms != null) {
                expanded.addAll(synonyms);
            }
        }
        return expanded;
    }

    private Set<String> tokenizeNormalized(String text) {
        Set<String> tokens = new LinkedHashSet<>();
        if (text != null && !text.isBlank()) {
            String normalized = normalizeVietnamese(text);
            String[] parts = TOKEN_SPLIT.split(normalized);
            for (String part : parts) {
                if (part.length() >= MIN_TOKEN_LEN) {
                    tokens.add(part);
                }
            }
        }
        return tokens;
    }

    private String normalizeVietnamese(String input) {
        String decomposed = Normalizer.normalize(input, Normalizer.Form.NFD);
        String stripped = DIACRITICS.matcher(decomposed).replaceAll("");
        return stripped.replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }

    private String formatSeasonLabel(Event event, boolean isCurrent) {
        String base = event.getSeasonName() + " - " + event.getTitle();
        return isCurrent ? base + " (Mùa hiện tại)" : base;
    }

    private double computeAverage(List<EventFeedback> feedbacks) {
        return feedbacks.stream()
                .filter(fb -> fb.getRatingScore() != null)
                .mapToInt(EventFeedback::getRatingScore)
                .average()
                .orElse(0.0);
    }

    private double parseDouble(Object raw, double fallback) {
        double value = fallback;
        if (raw instanceof Number number) {
            value = number.doubleValue();
        } else if (raw != null) {
            try {
                value = Double.parseDouble(String.valueOf(raw).trim());
            } catch (NumberFormatException ignored) {
                value = fallback;
            }
        }
        return value;
    }

    private String formatVnd(BigDecimal amount) {
        BigDecimal safe = amount == null ? BigDecimal.ZERO : amount;
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.US);
        return formatter.format(safe) + " VNĐ";
    }

    private String truncate(String text, int maxLength) {
        String result = "";
        if (text != null) {
            String trimmed = text.trim().replaceAll("\\s+", " ");
            result = trimmed.length() > maxLength
                    ? trimmed.substring(0, maxLength - 3) + "..."
                    : trimmed;
        }
        return result;
    }

    private record ScoredItem<T>(T item, double score) {
    }
}
