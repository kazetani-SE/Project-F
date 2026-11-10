package com.projectf.features.knowledge.ai;

import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiModelRouter {

    public static final String TIER_FAST = "FAST";
    public static final String TIER_DEEP = "DEEP";
    public static final String TIER_HEURISTIC = "HEURISTIC";

    private static final String PROVIDER_GEMINI = "gemini";
    private static final int DEEP_FB_LIMIT = 25;
    private static final int DEEP_CHARS_LIMIT = 3000;
    private static final int DEEP_CHAT_LIMIT = 160;
    private static final int DEEP_INC_LIMIT = 450;

    private static final List<String> DEEP_KEYWORDS = List.of(
            "tại sao",
            "nguyên nhân",
            "so sánh",
            "chiến lược",
            "phân tích",
            "tổng hợp",
            "rủi ro",
            "kế hoạch",
            "khắc phục triệt để",
            "đa mùa",
            "toàn diện"
    );

    private final String provider;
    private final String awsFastModel;
    private final String awsDeepModel;
    private final String geminiFastModel;
    private final String geminiDeepModel;

    public AiModelRouter(
            @Value("${app.ai.provider:bedrock}") String provider,
            @Value("${app.ai.bedrock.fast-model-id:anthropic.claude-3-haiku-20240307-v1:0}") String awsFastModel,
            @Value("${app.ai.bedrock.deep-model-id:anthropic.claude-3-5-sonnet-20240620-v1:0}") String awsDeepModel,
            @Value("${app.ai.gemini.fast-model-id:gemini-3.5-flash-lite}") String geminiFastModel,
            @Value("${app.ai.gemini.deep-model-id:gemini-3.5-flash}") String geminiDeepModel
    ) {
        this.provider = provider;
        this.awsFastModel = awsFastModel;
        this.awsDeepModel = awsDeepModel;
        this.geminiFastModel = geminiFastModel;
        this.geminiDeepModel = geminiDeepModel;
    }

    public AiModelDecision routeFeedbackReport(int feedbackCount, int totalTextLength) {
        AiModelDecision decision;
        if (feedbackCount >= DEEP_FB_LIMIT || totalTextLength >= DEEP_CHARS_LIMIT) {
            decision = new AiModelDecision(
                    TIER_DEEP,
                    resolveDeepModelId(),
                    "Deep Tier — Phân tích chuyên sâu trên tập dữ liệu khảo sát lớn (" + feedbackCount + " phiếu)"
            );
        } else {
            decision = new AiModelDecision(
                    TIER_FAST,
                    resolveFastModelId(),
                    "Fast Tier — Tối ưu chi phí cho tập dữ liệu gọn (" + feedbackCount + " phiếu)"
            );
        }
        return decision;
    }

    public AiModelDecision routeFaqSuggestions(int requestedCount) {
        return new AiModelDecision(
                TIER_FAST,
                resolveFastModelId(),
                "Fast Tier — Sinh bộ " + requestedCount + " câu hỏi FAQ dự kiến tốc độ cao & tiết kiệm token"
        );
    }

    public AiModelDecision routeIncidentDraft(String briefObservation) {
        AiModelDecision decision;
        int length = briefObservation == null ? 0 : briefObservation.trim().length();
        if (length >= DEEP_INC_LIMIT) {
            decision = new AiModelDecision(
                    TIER_DEEP,
                    resolveDeepModelId(),
                    "Deep Tier — Mô tả sự cố dài và phức tạp, cần suy luận sâu 5-Whys"
            );
        } else {
            decision = new AiModelDecision(
                    TIER_FAST,
                    resolveFastModelId(),
                    "Fast Tier — Phân tích nhanh Post-Mortem 4 mục cho sự cố đơn lẻ"
            );
        }
        return decision;
    }

    public AiModelDecision routeKnowledgeChat(String message) {
        AiModelDecision decision;
        String normalized = message == null ? "" : message.trim().toLowerCase(Locale.ROOT);
        boolean hasDeepKeyword = DEEP_KEYWORDS.stream().anyMatch(normalized::contains);

        if (hasDeepKeyword || normalized.length() >= DEEP_CHAT_LIMIT) {
            decision = new AiModelDecision(
                    TIER_DEEP,
                    resolveDeepModelId(),
                    "Deep Tier — Câu hỏi yêu cầu suy luận, phân tích nguyên nhân hoặc tổng hợp đa nguồn"
            );
        } else {
            decision = new AiModelDecision(
                    TIER_FAST,
                    resolveFastModelId(),
                    "Fast Tier — Câu hỏi tra cứu thông tin trực tiếp, tối ưu tốc độ & chi phí"
            );
        }
        return decision;
    }

    private String resolveFastModelId() {
        return PROVIDER_GEMINI.equalsIgnoreCase(provider) ? geminiFastModel : awsFastModel;
    }

    private String resolveDeepModelId() {
        return PROVIDER_GEMINI.equalsIgnoreCase(provider) ? geminiDeepModel : awsDeepModel;
    }
}
