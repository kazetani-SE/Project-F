package com.projectf.features.finance.service.support;

import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.google.genai.Client;
import com.google.genai.errors.ApiException;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.GoogleSearch;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;

@Slf4j
@Component
public class FinanceGeminiGateway {

    public static final String DEFAULT_MODEL = "gemini-3.5-flash-lite";
    private static final String KEY_SUCCESS = "success";

    @Value("${app.ai.gemini.api-key:${gemini.api.key:${GEMINI_API_KEY:}}}")
    private String apiKey;

    /** Gọi model với văn bản (có thể kèm tool, ví dụ Google Search qua config). */
    public String generateText(String prompt, GenerateContentConfig config) {
        requireKey();
        try (Client client = Client.builder().apiKey(apiKey).build()) {
            GenerateContentResponse res = client.models.generateContent(DEFAULT_MODEL, prompt, config);
            return requireText(res);
        }
    }

    /**
     * Gọi model với ảnh + prompt (quét bill). Kiểm tra lại cú pháp theo version
     * google-genai của bạn.
     */
    public String generateWithImage(String prompt, byte[] image, String mimeType,
            GenerateContentConfig config) {
        requireKey();
        try (Client client = Client.builder().apiKey(apiKey).build()) {
            Content content = Content.fromParts(
                    Part.fromText(prompt),
                    Part.fromBytes(image, mimeType));
            GenerateContentResponse res = client.models.generateContent(DEFAULT_MODEL, content, config);
            return requireText(res);
        }
    }

    /** Chẩn đoán nhanh: gọi model thật, có hoặc không Google Search. */
    public Map<String, Object> ping(String model, boolean useSearch) {
        String modelName = (model == null || model.isBlank()) ? DEFAULT_MODEL : model.trim();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("model", modelName);
        result.put("useSearch", useSearch);

        if (apiKey == null || apiKey.isBlank()) {
            result.put(KEY_SUCCESS, false);
            result.put("error", "Chưa cấu hình GEMINI_API_KEY");
        } else {
            long start = System.currentTimeMillis();
            try (Client client = Client.builder().apiKey(apiKey).build()) {
                GenerateContentConfig.Builder cfg = GenerateContentConfig.builder()
                        .maxOutputTokens(256);

                if (useSearch) {
                    cfg.tools(List.of(Tool.builder()
                            .googleSearch(GoogleSearch.builder().build())
                            .build()));
                }

                GenerateContentResponse res = client.models.generateContent(modelName, "Trả lời đúng 1 từ: OK",
                        cfg.build());

                result.put(KEY_SUCCESS, true);
                result.put("response", res.text());
            } catch (ApiException e) {
                result.put(KEY_SUCCESS, false);
                result.put("httpCode", e.code());
                result.put("error", e.getMessage());
            } catch (Exception e) {
                result.put(KEY_SUCCESS, false);
                result.put("error", e.getMessage());
            } finally {
                result.put("elapsedMs", System.currentTimeMillis() - start);
            }
        }

        return result;
    }

    private void requireKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình GEMINI_API_KEY.");
        }
    }

    private String requireText(GenerateContentResponse res) {
        String text = res.text();
        if (text == null || text.isBlank()) {
            throw new IllegalStateException("AI không trả về nội dung phản hồi.");
        }
        return text;
    }
}