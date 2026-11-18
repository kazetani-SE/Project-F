package com.projectf.features.finance.service.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectf.features.finance.dto.response.BenchmarkAiSuggestionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class BenchmarkCacheStore {

    private final Map<String, BenchmarkAiSuggestionResponse> byNameAndUnit = new LinkedHashMap<>();
    private final Map<String, BenchmarkAiSuggestionResponse> byName = new LinkedHashMap<>();

    public BenchmarkCacheStore(
            ObjectMapper objectMapper,
            @Value("${benchmark.ai.cache-file:classpath:cache/benchmark-ai-cache.json}") Resource cacheFile) {

        if (!cacheFile.exists()) {
            log.warn("Không tìm thấy file cache benchmark: {}", cacheFile);
            return;
        }

        try (InputStream is = cacheFile.getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            for (JsonNode node : root) {
                try {
                    String itemName = node.path("itemName").asText("");
                    String unit = node.path("unit").asText("");
                    if (itemName.isBlank()) {
                        continue;
                    }
                    BenchmarkAiSuggestionResponse value = objectMapper.treeToValue(node,
                            BenchmarkAiSuggestionResponse.class);
                    byNameAndUnit.put(key(itemName, unit), value);
                    byName.putIfAbsent(normalize(itemName), value);
                } catch (Exception e) {
                    log.warn("Bỏ qua 1 dòng cache lỗi: {}", e.getMessage());
                }
            }
            log.info("Đã nạp {} benchmark mẫu từ {}", byNameAndUnit.size(), cacheFile);
        } catch (IOException e) {
            log.error("Không đọc được file cache benchmark: {}", e.getMessage(), e);
        }
    }

    /** Khớp chính xác (tên + đơn vị) trước, không có thì khớp theo tên. */
    public Optional<BenchmarkAiSuggestionResponse> find(String itemName, String unit) {
        BenchmarkAiSuggestionResponse exact = byNameAndUnit.get(key(itemName, unit));
        if (exact != null) {
            return Optional.of(exact);
        }
        return Optional.ofNullable(byName.get(normalize(itemName)));
    }

    private static String key(String name, String unit) {
        return normalize(name) + "|" + normalize(unit);
    }

    // bỏ dấu, hạ chữ thường, gộp khoảng trắng: "Thuê Sân" == "thue san"
    private static String normalize(String s) {
        if (s == null) {
            return "";
        }
        String n = Normalizer.normalize(s.trim().toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd');
        return n.replaceAll("\\s+", " ");
    }
}