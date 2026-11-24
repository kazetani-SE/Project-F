package com.projectf.features.knowledge.ai;

import com.projectf.common.enums.Department;
import com.projectf.common.enums.IncidentSeverity;
import com.projectf.features.document.entity.EventDocument;
import com.projectf.features.finance.entity.EventBudgetSummaryView;
import com.projectf.features.knowledge.ai.KnowledgeContextRetriever.FeedbackInsights;
import com.projectf.features.knowledge.ai.KnowledgeContextRetriever.MultiSeasonBundle;
import com.projectf.features.knowledge.dto.request.DraftIncidentAiRequest;
import com.projectf.features.knowledge.dto.request.GenerateFaqSuggestionsRequest;
import com.projectf.features.knowledge.dto.request.KnowledgeChatRequest;
import com.projectf.features.knowledge.dto.response.DraftIncidentAiResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionItemResponse;
import com.projectf.features.knowledge.dto.response.FaqSuggestionsResultResponse;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse.DepartmentActionItem;
import com.projectf.features.knowledge.dto.response.FeedbackAiReportResponse.SuggestedIncidentItem;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse;
import com.projectf.features.knowledge.dto.response.KnowledgeChatResponse.CitationItem;
import com.projectf.features.knowledge.entity.EventFaq;
import com.projectf.features.knowledge.entity.EventFeedback;
import com.projectf.features.knowledge.entity.EventIncident;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class LocalHeuristicAiEngine {

    public static final String MODEL_NAME = "smart-fallback-heuristic-v1";
    private static final String DEPT_PLAN = "PLAN";
    private static final String DEPT_MEDIA = "MEDIA";
    private static final String DEPT_HR = "HR";
    private static final String DEPT_ACADEMIC = "ACADEMIC";
    private static final String FALLBACK_TAG = " (Chế độ nội bộ Heuristic)";
    private static final int MIN_FOLLOW_UPS = 2;
    private static final int MAX_FOLLOW_UPS = 3;

    public record HeuristicFeedbackDraft(
            String executiveSummary,
            Map<String, Integer> sentimentMap,
            List<String> topHighlights,
            List<String> topImprovements,
            List<DepartmentActionItem> departmentActions,
            List<SuggestedIncidentItem> incidentDrafts
    ) {
    }

    public HeuristicFeedbackDraft buildFeedbackReport(List<EventFeedback> feedbacks, double avgRating) {
        int total = feedbacks.size();
        Map<String, Integer> sentiment = computeSentiment(feedbacks);

        List<String> highlights = extractHighlights(feedbacks);
        List<String> improvements = extractImprovements(feedbacks);

        String summary;
        if (total == 0) {
            summary = "Sự kiện hiện chưa có phiếu khảo sát nào được ghi nhận. "
                    + "Hãy import tệp Excel khảo sát từ biểu mẫu để AI tổng hợp báo cáo chi tiết.";
        } else {
            int positivePct = sentiment.getOrDefault("positive", 0);
            int negativePct = sentiment.getOrDefault("negative", 0);
            summary = String.format(
                    Locale.US,
                    "Tổng hợp trên %d phiếu phản hồi với điểm trung bình %.2f/5.0★ (%d%% đánh giá tích cực, %d%% cần khắc phục). "
                            + "Các phản hồi cho thấy điểm sáng chính nằm ở chất lượng tổ chức và nội dung, "
                            + "đồng thời cần theo dõi các góp ý cải thiện cụ thể bên dưới cho mùa sau.",
                    total,
                    avgRating,
                    positivePct,
                    negativePct
            );
        }

        List<DepartmentActionItem> deptActions = List.of(
                new DepartmentActionItem(
                        DEPT_PLAN,
                        "Rà soát lại kịch bản điều phối (Running Order), tối ưu luồng đón tiếp giờ cao điểm và khung thời gian nghỉ giữa giờ."
                ),
                new DepartmentActionItem(
                        DEPT_MEDIA,
                        "Kiểm tra kỹ hệ thống âm thanh, micro và slide trình chiếu trước giờ G 60 phút; gửi tài liệu/thông báo sớm cho người tham dự."
                ),
                new DepartmentActionItem(
                        DEPT_HR,
                        "Phân bổ thêm tình nguyện viên hướng dẫn tại sảnh check-in và khu vực hậu cần ăn nhẹ (teabreak)."
                ),
                new DepartmentActionItem(
                        DEPT_ACADEMIC,
                        "Tăng thời lượng phiên Q&A tương tác trực tiếp với diễn giả/ban giám khảo và gửi tài liệu tổng kết sau sự kiện."
                )
        );

        List<SuggestedIncidentItem> incDrafts = buildSuggestedIncidents(improvements);

        return new HeuristicFeedbackDraft(
                summary,
                sentiment,
                highlights,
                improvements,
                deptActions,
                incDrafts
        );
    }

    public FaqSuggestionsResultResponse buildFaqSuggestions(
            GenerateFaqSuggestionsRequest request,
            List<EventFaq> existingFaqs,
            List<EventIncident> incidents,
            AiModelDecision decision
    ) {
        int desiredCount = request.count() != null && request.count() > 0 ? Math.min(request.count(), 8) : 5;
        String topic = request.focusTopic() == null ? "" : request.focusTopic().trim();
        Set<String> existingLower = existingFaqs.stream()
                .map(faq -> faq.getQuestion().trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<FaqSuggestionItemResponse> pool = new ArrayList<>();

        for (EventIncident inc : incidents) {
            pool.add(new FaqSuggestionItemResponse(
                    "Nếu xảy ra tình huống \"" + inc.getTitle() + "\" thì người tham dự hoặc thành viên cần liên hệ ai và xử lý thế nào?",
                    "Vận hành & Xử lý sự cố",
                    "Rút ra trực tiếp từ Nhật ký sự cố Post-Mortem của sự kiện để chủ động phòng ngừa.",
                    "Gợi ý: Nêu rõ đầu mối phụ trách (" + inc.getDepartments() + ") và quy trình xử lý: " + inc.getImmediateSolution()
            ));
        }

        pool.add(new FaqSuggestionItemResponse(
                "Sự kiện có giới hạn đối tượng tham gia hoặc yêu cầu kiến thức nền tảng trước khi đăng ký không?",
                "Thể lệ & Tham dự",
                "Câu hỏi phổ biến nhất của sinh viên năm nhất và người mới tìm hiểu chuỗi sự kiện.",
                "Gợi ý: Nêu rõ đối tượng được phép đăng ký, quy định lập đội (cá nhân/nhóm) và quyền lợi kèm theo."
        ));
        pool.add(new FaqSuggestionItemResponse(
                "Nếu bận lịch học đột xuất thì có được đổi ca tham dự, bảo lưu suất đăng ký hoặc nhờ người khác đi thay không?",
                "Thể lệ & Tham dự",
                "Giúp giảm tỷ lệ vắng mặt không báo trước (no-show) vào ngày diễn ra sự kiện.",
                "Gợi ý: Quy định thời hạn báo hủy/thay đổi thông tin tối thiểu 24h trước giờ khai mạc qua kênh liên hệ chính thức."
        ));
        pool.add(new FaqSuggestionItemResponse(
                "Người tham dự cần chuẩn bị những vật dụng gì khi check-in và ban tổ chức có hỗ trợ ăn trưa/teabreak không?",
                "Hậu cần & Đón tiếp",
                "Tránh ùn tắc tại bàn check-in và giúp người tham dự chủ động chuẩn bị cá nhân.",
                "Gợi ý: Nhắc mang thẻ sinh viên/email xác nhận, laptop (nếu có workshop) và thông tin khu vực teabreak."
        ));
        pool.add(new FaqSuggestionItemResponse(
                "Quy trình hoàn ứng chi phí mua vật tư cho thành viên BTC yêu cầu những chứng từ gì để được duyệt?",
                "Tài chính & Nội bộ BTC",
                "Đảm bảo tuân thủ quy tắc bắt buộc đính kèm hóa đơn chứng từ trước khi duyệt chi.",
                "Gợi ý: Yêu cầu ảnh chụp hóa đơn hợp lệ (<= 15MB), đúng hạng mục dự trù và gửi yêu cầu cho Ban HR duyệt."
        ));
        pool.add(new FaqSuggestionItemResponse(
                "Giấy chứng nhận (Certificate) và điểm rèn luyện sẽ được gửi sau sự kiện bao lâu và theo hình thức nào?",
                "Quyền lợi & Sau sự kiện",
                "Giảm lượng tin nhắn hỏi thăm fanpage sau khi sự kiện kết thúc.",
                "Gợi ý: Nêu điều kiện nhận Certificate (tham gia đủ các phiên + điền form feedback) và thời gian trả kết quả dự kiến (5-7 ngày)."
        ));

        if (!topic.isBlank()) {
            pool.add(0, new FaqSuggestionItemResponse(
                    "Các quy định và lưu ý quan trọng nhất liên quan đến \"" + topic + "\" trong mùa sự kiện năm nay là gì?",
                    topic,
                    "Được sinh theo chủ đề trọng tâm do người quản trị yêu cầu.",
                    "Gợi ý: Điền quy định cụ thể, mốc thời gian áp dụng và kênh hỗ trợ trực tiếp cho chủ đề " + topic + "."
            ));
        }

        List<FaqSuggestionItemResponse> filtered = pool.stream()
                .filter(item -> !existingLower.contains(item.question().trim().toLowerCase(Locale.ROOT)))
                .limit(desiredCount)
                .toList();

        return new FaqSuggestionsResultResponse(
                MODEL_NAME,
                AiModelRouter.TIER_HEURISTIC,
                decision.routingReason() + FALLBACK_TAG,
                filtered
        );
    }

    public DraftIncidentAiResponse buildIncidentDraft(
            DraftIncidentAiRequest request,
            AiModelDecision decision
    ) {
        String raw = request.briefObservation().trim();
        String lower = raw.toLowerCase(Locale.ROOT);

        IncidentSeverity severity = IncidentSeverity.MEDIUM;
        if (lower.contains("sập") || lower.contains("cháy") || lower.contains("mất điện")
                || lower.contains("nghiêm trọng") || lower.contains("hủy") || lower.contains("cấp cứu")) {
            severity = IncidentSeverity.CRITICAL;
        } else if (lower.contains("trễ") || lower.contains("thiếu") || lower.contains("hỏng")
                || lower.contains("hú") || lower.contains("mất kết nối") || lower.contains("ùn tắc")) {
            severity = IncidentSeverity.HIGH;
        } else if (lower.contains("nhẹ") || lower.contains("nhỏ")) {
            severity = IncidentSeverity.LOW;
        }

        List<Department> depts = new ArrayList<>();
        if (lower.contains("âm thanh") || lower.contains("mic") || lower.contains("màn hình")
                || lower.contains("led") || lower.contains("poster") || lower.contains("slide")
                || lower.contains("livestream")) {
            depts.add(Department.MEDIA);
        }
        if (lower.contains("nhân sự") || lower.contains("tình nguyện") || lower.contains("ctv")
                || lower.contains("phân công") || lower.contains("điểm danh")) {
            depts.add(Department.HR);
        }
        if (lower.contains("diễn giả") || lower.contains("đề thi") || lower.contains("chuyên môn")
                || lower.contains("giám khảo") || lower.contains("nội dung")) {
            depts.add(Department.ACADEMIC);
        }
        if (depts.isEmpty() || lower.contains("hậu cần") || lower.contains("check-in")
                || lower.contains("timeline") || lower.contains("ăn") || lower.contains("nước")) {
            depts.add(Department.PLAN);
        }

        String shortTitle = raw.length() > 75 ? raw.substring(0, 72) + "..." : raw;

        return new DraftIncidentAiResponse(
                shortTitle,
                severity,
                depts,
                "Sự cố phát sinh trong quá trình vận hành sự kiện: " + raw,
                "Khâu kiểm tra chéo (cross-check) trước giờ G chưa có phương án dự phòng (backup plan) đầy đủ "
                        + "và thiếu đầu mối cảnh báo sớm khi lưu lượng/tải tăng đột biến.",
                "Điều động nhân sự trực chiến xử lý tại chỗ, kích hoạt phương án thay thế tạm thời "
                        + "và thông báo kịp thời tới người tham dự để ổn định chương trình.",
                "Bổ sung hạng mục này vào Checklist rà soát bắt buộc trước sự kiện 24h cho các mùa tiếp theo; "
                        + "luôn chuẩn bị sẵn thiết bị/nhân sự dự phòng tối thiểu 15%.",
                MODEL_NAME,
                AiModelRouter.TIER_HEURISTIC,
                decision.routingReason() + FALLBACK_TAG
        );
    }

    public KnowledgeChatResponse buildChatResponse(
            KnowledgeChatRequest request,
            MultiSeasonBundle bundle,
            FeedbackInsights feedbackInsights,
            AiModelDecision decision
    ) {
        String query = request.message().trim().toLowerCase(Locale.ROOT);
        List<EventFaq> faqs = bundle.faqs();
        List<EventIncident> incidents = bundle.incidents();
        List<EventFeedback> feedbacks = bundle.currentFeedbacks().isEmpty()
                ? bundle.seriesFeedbacks()
                : bundle.currentFeedbacks();

        List<CitationItem> citations = new ArrayList<>();
        StringBuilder answerBuilder = new StringBuilder(1024);

        List<EventFaq> matchedFaqs = faqs.stream()
                .filter(faq -> matchesQuery(query, faq.getQuestion() + " " + faq.getAnswer() + " " + faq.getCategory()))
                .limit(2)
                .toList();

        List<EventIncident> matchedIncidents = incidents.stream()
                .filter(inc -> matchesQuery(
                        query,
                        inc.getTitle() + " " + inc.getDescription() + " " + inc.getRootCause() + " " + inc.getLessonLearned()
                ))
                .limit(3)
                .toList();

        answerBuilder.append("Dựa trên **Kho Tri Thức Đa Mùa** (")
                .append(faqs.size()).append(" FAQ, ")
                .append(incidents.size()).append(" sự cố Post-Mortem, ")
                .append(feedbacks.size()).append(" phiếu khảo sát và ")
                .append(bundle.approvedDocuments().size()).append(" tài liệu đã duyệt):\n\n");

        boolean matchedSection = false;
        if (asksAboutFinanceOrApproval(query)) {
            matchedSection = true;
            appendFinanceAndPolicyAnswer(answerBuilder, bundle.budgetSummary(), citations);
        }

        if (!matchedFaqs.isEmpty()) {
            matchedSection = true;
            answerBuilder.append("### Thông tin từ Kho FAQ Chuỗi Sự Kiện\n");
            for (EventFaq faq : matchedFaqs) {
                answerBuilder.append("- **").append(faq.getQuestion()).append("**: ")
                        .append(faq.getAnswer()).append('\n');
                citations.add(new CitationItem("FAQ", faq.getQuestion(), faq.getAnswer()));
            }
            answerBuilder.append('\n');
        }

        if (!matchedIncidents.isEmpty()) {
            matchedSection = true;
            answerBuilder.append("### Bài học từ Nhật ký Sự cố & Post-Mortem\n");
            for (EventIncident inc : matchedIncidents) {
                answerBuilder.append("- **[").append(inc.getSeverity()).append("] ").append(inc.getTitle())
                        .append("**: Nguyên nhân do *").append(inc.getRootCause())
                        .append("*. Bài học kế thừa: **").append(inc.getLessonLearned()).append("**\n");
                citations.add(new CitationItem("INCIDENT", inc.getTitle(), inc.getLessonLearned()));
            }
            answerBuilder.append('\n');
        }

        if (asksAboutDocuments(query) && !bundle.approvedDocuments().isEmpty()) {
            matchedSection = true;
            answerBuilder.append("### Tài liệu Kế hoạch đã phê duyệt\n");
            for (EventDocument doc : bundle.approvedDocuments().stream().limit(5).toList()) {
                answerBuilder.append("- **").append(doc.getTitle()).append("** (`")
                        .append(doc.getDocType()).append("` — v").append(doc.getVersion()).append(")\n");
                citations.add(new CitationItem("DOCUMENT", doc.getTitle(), "Loại: " + doc.getDocType() + " | v" + doc.getVersion()));
            }
            answerBuilder.append('\n');
        }

        if (!matchedSection || asksAboutFeedback(query)) {
            appendFeedbackAndOverview(answerBuilder, faqs, incidents, feedbacks, feedbackInsights, citations);
        }

        List<String> followUps = buildDataAwareFollowUps(bundle, feedbacks);

        return new KnowledgeChatResponse(
                answerBuilder.toString().trim(),
                MODEL_NAME,
                AiModelRouter.TIER_HEURISTIC,
                decision.routingReason() + FALLBACK_TAG,
                citations,
                followUps
        );
    }

    public List<String> buildDataAwareFollowUps(MultiSeasonBundle bundle, List<EventFeedback> feedbacks) {
        List<String> followUps = new ArrayList<>();
        if (!feedbacks.isEmpty()) {
            followUps.add("Phân tích chi tiết điểm từng tiêu chí và góp ý nổi bật trong các phiếu khảo sát?");
        }
        if (!bundle.incidents().isEmpty()) {
            followUps.add("Tổng hợp các bài học kinh nghiệm quan trọng nhất từ nhật ký sự cố?");
        }
        if (!bundle.faqs().isEmpty()) {
            followUps.add("Những câu hỏi FAQ nào đang được ghim ưu tiên trong chuỗi sự kiện?");
        }
        if (!bundle.approvedDocuments().isEmpty() && followUps.size() < MAX_FOLLOW_UPS) {
            followUps.add("Sự kiện hiện đã có những tài liệu kế hoạch nào được phê duyệt?");
        }
        if (bundle.budgetSummary().isPresent() && followUps.size() < MAX_FOLLOW_UPS) {
            followUps.add("Tình hình ngân sách, thực chi và quỹ còn lại của sự kiện hiện tại ra sao?");
        }
        if (followUps.size() < MIN_FOLLOW_UPS) {
            followUps.add("Quy chế phân quyền duyệt tài liệu, ấn phẩm và khoản chi trong Project F như thế nào?");
        }
        return followUps.stream().limit(MAX_FOLLOW_UPS).toList();
    }

    private void appendFinanceAndPolicyAnswer(
            StringBuilder answerBuilder,
            Optional<EventBudgetSummaryView> budgetOpt,
            List<CitationItem> citations
    ) {
        answerBuilder.append("### Quy chế Phê duyệt & Ngân sách Sự kiện\n"
                + "- **Phê duyệt chi phí & dự trù**: Vai trò **HR** trong BTC đối soát hóa đơn và duyệt đề xuất của **MEMBER** (bắt buộc đính kèm tối thiểu 1 hóa đơn hợp lệ <= 15MB trước khi `APPROVED`). **Ban Chủ nhiệm CLB** (`PRESIDENT`, `VICEPRESIDENT`) có toàn quyền duyệt.\n"
                + "- **Phê duyệt tài liệu & ấn phẩm**: **LEAD_HEADER** duyệt tài liệu kế hoạch; **HR** duyệt ấn phẩm truyền thông do **MEDIA** thiết kế.\n");
        citations.add(new CitationItem("POLICY", "Quy chế Phân quyền & Duyệt chi Project F",
                "HR duyệt ấn phẩm và khoản chi của MEMBER; LEAD_HEADER duyệt tài liệu; BCN CLB có toàn quyền."));

        budgetOpt.ifPresent(summary -> {
            String snippet = "Quỹ cấp phát: " + formatVnd(summary.getAllocatedFund())
                    + " | Dự trù đã duyệt: " + formatVnd(summary.getTotalBudgetEst())
                    + " | Thực chi đã duyệt: " + formatVnd(summary.getTotalActualSpent())
                    + " | Quỹ còn lại: " + formatVnd(summary.getRemainingFund());
            answerBuilder.append("- **Số liệu ngân sách hiện tại**: ").append(snippet).append('\n');
            citations.add(new CitationItem("FINANCE", "Tổng quan Ngân sách Sự kiện", snippet));
        });
        answerBuilder.append('\n');
    }

    private void appendFeedbackAndOverview(
            StringBuilder answerBuilder,
            List<EventFaq> faqs,
            List<EventIncident> incidents,
            List<EventFeedback> feedbacks,
            FeedbackInsights feedbackInsights,
            List<CitationItem> citations
    ) {
        if (feedbacks.isEmpty()) {
            if (!incidents.isEmpty()) {
                EventIncident topInc = incidents.get(0);
                answerBuilder.append("- **Sự cố gần nhất**: *").append(topInc.getTitle())
                        .append("* (Mức độ: `").append(topInc.getSeverity())
                        .append("`) — Bài học: ").append(topInc.getLessonLearned()).append('\n');
                citations.add(new CitationItem("INCIDENT", topInc.getTitle(), topInc.getLessonLearned()));
            }
            if (!faqs.isEmpty()) {
                EventFaq topFaq = faqs.get(0);
                answerBuilder.append("- **FAQ trọng tâm**: *").append(topFaq.getQuestion())
                        .append("* — ").append(topFaq.getAnswer()).append('\n');
                citations.add(new CitationItem("FAQ", topFaq.getQuestion(), topFaq.getAnswer()));
            }
        } else {
            String fbSummary = String.format(
                    Locale.US,
                    "Điểm đánh giá trung bình đạt %.2f/5.0★ trên tổng số %d phiếu khảo sát.",
                    feedbackInsights.avgRating(),
                    feedbacks.size()
            );
            answerBuilder.append("### Tổng hợp Khảo sát & Feedback\n- **Đánh giá chung**: ")
                    .append(fbSummary).append('\n');
            for (Map.Entry<String, String> entry : feedbackInsights.criterionAverages().entrySet().stream().limit(4).toList()) {
                answerBuilder.append("- **").append(entry.getKey()).append("**: ").append(entry.getValue()).append('\n');
            }
            for (String note : feedbackInsights.improvements().stream().limit(2).toList()) {
                answerBuilder.append("- **Góp ý cải thiện**: ").append(note).append('\n');
            }
            for (String suggestion : feedbackInsights.suggestions().stream().limit(2).toList()) {
                answerBuilder.append("- **Ý kiến chi tiết**: ").append(suggestion).append('\n');
            }
            citations.add(new CitationItem("FEEDBACK", "Thống kê Khảo sát Sự kiện", fbSummary));
        }
    }

    private boolean asksAboutFinanceOrApproval(String query) {
        return query.contains("duyệt") || query.contains("chi phí") || query.contains("ngân sách")
                || query.contains("hoàn ứng") || query.contains("thanh toán") || query.contains("quỹ")
                || query.contains("phân quyền");
    }

    private boolean asksAboutDocuments(String query) {
        return query.contains("tài liệu") || query.contains("kế hoạch") || query.contains("running order")
                || query.contains("master plan") || query.contains("document");
    }

    private boolean asksAboutFeedback(String query) {
        return query.contains("feedback") || query.contains("khảo sát") || query.contains("góp ý")
                || query.contains("đánh giá") || query.contains("tiêu chí") || query.contains("cải thiện");
    }

    private boolean matchesQuery(String query, String targetText) {
        String lowerTarget = targetText.toLowerCase(Locale.ROOT);
        String[] tokens = query.split("\\s+");
        int hits = 0;
        for (String token : tokens) {
            if (token.length() >= 3 && lowerTarget.contains(token)) {
                hits++;
            }
        }
        return hits >= 1;
    }

    private Map<String, Integer> computeSentiment(List<EventFeedback> feedbacks) {
        Map<String, Integer> sentiment = new LinkedHashMap<>();
        if (feedbacks.isEmpty()) {
            sentiment.put("positive", 0);
            sentiment.put("neutral", 0);
            sentiment.put("negative", 0);
        } else {
            int total = feedbacks.size();
            long pos = feedbacks.stream().filter(fb -> fb.getRatingScore() != null && fb.getRatingScore() >= 4).count();
            long neu = feedbacks.stream().filter(fb -> fb.getRatingScore() != null && fb.getRatingScore() == 3).count();
            int posPct = (int) Math.round(pos * 100.0 / total);
            int neuPct = (int) Math.round(neu * 100.0 / total);
            int negPct = Math.max(0, 100 - posPct - neuPct);
            sentiment.put("positive", posPct);
            sentiment.put("neutral", neuPct);
            sentiment.put("negative", negPct);
        }
        return sentiment;
    }

    private List<String> extractHighlights(List<EventFeedback> feedbacks) {
        List<String> highlights = feedbacks.stream()
                .map(EventFeedback::getHighlightContent)
                .filter(text -> text != null && !text.isBlank() && text.trim().length() > 6)
                .distinct()
                .limit(4)
                .collect(Collectors.toCollection(ArrayList::new));

        if (highlights.isEmpty()) {
            collectCustomSuggestions(feedbacks, highlights, 4);
        }

        if (highlights.isEmpty()) {
            highlights.add("Nội dung chương trình thiết thực, bám sát nhu cầu thực tế của sinh viên.");
            highlights.add("Đội ngũ Ban Tổ Chức và tình nguyện viên hỗ trợ nhiệt tình, thân thiện.");
            highlights.add("Không khí sự kiện sôi nổi, phần giao lưu Q&A mang lại nhiều góc nhìn giá trị.");
        }
        return highlights;
    }

    private List<String> extractImprovements(List<EventFeedback> feedbacks) {
        List<String> improvements = feedbacks.stream()
                .map(EventFeedback::getImproveContent)
                .filter(text -> text != null && !text.isBlank() && text.trim().length() > 6)
                .distinct()
                .limit(4)
                .collect(Collectors.toCollection(ArrayList::new));

        if (improvements.isEmpty()) {
            collectCustomSuggestions(feedbacks, improvements, 4);
        }

        if (improvements.isEmpty()) {
            improvements.add("Cần tối ưu quy trình đón tiếp (check-in) để giảm thời gian chờ đợi đầu giờ.");
            improvements.add("Kiểm tra kỹ chất lượng âm thanh/micro và điều hòa nhiệt độ trong hội trường.");
            improvements.add("Gửi thông báo lịch trình chi tiết và tài liệu hướng dẫn sớm hơn trước ngày diễn ra.");
        }
        return improvements;
    }

    private void collectCustomSuggestions(List<EventFeedback> feedbacks, List<String> target, int maxCount) {
        for (EventFeedback fb : feedbacks) {
            if (target.size() >= maxCount) {
                break;
            }
            Map<String, Object> custom = fb.getCustomResponses();
            if (custom != null && custom.get("suggestions") instanceof Collection<?> items) {
                for (Object item : items) {
                    if (target.size() >= maxCount) {
                        break;
                    }
                    if (item instanceof Map<?, ?> map && map.get("answer") != null) {
                        String ans = String.valueOf(map.get("answer")).trim();
                        if (ans.length() > 6 && !target.contains(ans)) {
                            target.add(ans);
                        }
                    }
                }
            }
        }
    }

    private List<SuggestedIncidentItem> buildSuggestedIncidents(List<String> improvements) {
        List<SuggestedIncidentItem> items = new ArrayList<>();
        String primaryIssue = improvements.isEmpty()
                ? "Ùn tắc cục bộ tại khu vực đón tiếp và trễ tiến độ khai mạc"
                : improvements.get(0);
        items.add(new SuggestedIncidentItem(
                "Vấn đề phản ánh từ Feedback: " + (primaryIssue.length() > 80 ? primaryIssue.substring(0, 77) + "..." : primaryIssue),
                "MEDIUM",
                List.of(DEPT_PLAN, DEPT_HR),
                "Nhiều người tham dự phản ánh qua phiếu khảo sát sau sự kiện: " + primaryIssue,
                "Chưa dự báo sát lưu lượng người tham dự tập trung cùng lúc và thiếu phương án phân luồng từ xa.",
                "Tăng cường nhân sự điều phối tại hiện trường và điều chỉnh linh hoạt thời lượng các phiên tiếp theo.",
                "Thiết lập quy trình diễn tập (Dry-run) và bố trí thêm bàn hỗ trợ dự phòng cho mùa sự kiện kế tiếp."
        ));
        return items;
    }

    private String formatVnd(BigDecimal amount) {
        BigDecimal safe = amount == null ? BigDecimal.ZERO : amount;
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.US);
        return formatter.format(safe) + " VNĐ";
    }
}
