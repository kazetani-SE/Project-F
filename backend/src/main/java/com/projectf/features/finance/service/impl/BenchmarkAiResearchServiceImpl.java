package com.projectf.features.finance.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GoogleSearch;
import com.google.genai.types.ThinkingConfig;
import com.google.genai.types.Tool;
import com.projectf.features.finance.dto.request.BenchmarkAiResearchRequest;
import com.projectf.features.finance.dto.response.BenchmarkAiSuggestionResponse;
import com.projectf.features.finance.service.BenchmarkAiResearchService;
import com.projectf.features.finance.service.support.GeminiGateway;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class BenchmarkAiResearchServiceImpl implements BenchmarkAiResearchService {

    private final GeminiGateway gemini;
    private final ObjectMapper objectMapper;

    @Override
    public BenchmarkAiSuggestionResponse researchMarketBenchmark(BenchmarkAiResearchRequest request) {
        GenerateContentConfig config = GenerateContentConfig.builder()
                .tools(List.of(Tool.builder()
                        .googleSearch(GoogleSearch.builder().build())
                        .build()))
                .maxOutputTokens(2048)
                .thinkingConfig(ThinkingConfig.builder().thinkingBudget(0).build())
                .build();

        String raw = gemini.generateText(buildResearchPrompt(request), config);

        try {
            return objectMapper.readValue(stripMarkdownCodeFence(raw), BenchmarkAiSuggestionResponse.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("AI trả về JSON không hợp lệ: " + raw, e);
        }
    }

    private String buildResearchPrompt(BenchmarkAiResearchRequest request) {
        String location = (request.locationContext() == null || request.locationContext().isBlank())
                ? "TP.HCM"
                : request.locationContext().trim();
        String itemName = request.itemName().trim();
        String unit = request.unit().trim();

        return """
                Tìm nhanh 1 shop/nhà cung cấp tại %s đang bán hoặc cho thuê "%s" (đơn vị: %s).
                Quy tắc:
                - Chỉ thực hiện tối đa 1 lượt tìm kiếm Google, chọn ngay 1 đơn vị/sản phẩm phù hợp đầu tiên có giá công khai (VNĐ). Không so sánh nhiều nơi.
                - Trả về DUY NHẤT 1 JSON hợp lệ (không markdown, không giải thích):
                {"itemName":"%s","unit":"%s","estUnitPrice":0,"supplierName":"Tên shop","supplierLink":"https://...","referenceNote":"1 câu ngắn gọn về giá/nguồn"}
                """
                .formatted(location, itemName, unit, itemName, unit);
    }

    private String stripMarkdownCodeFence(String text) {
        String trimmed = text.trim();
        String result = trimmed;

        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                result = trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }

        return result;
    }
}