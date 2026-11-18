package com.projectf.features.finance.service.support;

import com.projectf.features.finance.dto.request.BenchmarkAiResearchRequest;
import com.projectf.features.finance.dto.response.BenchmarkAiSuggestionResponse;
import com.projectf.features.finance.service.BenchmarkAiResearchService;
import com.projectf.features.finance.service.impl.BenchmarkAiResearchServiceImpl;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Primary
@RequiredArgsConstructor
public class BenchmarkAiResearchRouter implements BenchmarkAiResearchService {

    public enum Mode {
        CACHE, LIVE, AUTO
    }

    private final BenchmarkAiResearchServiceImpl liveService;
    private final BenchmarkCacheStore cacheStore;

    @Value("${benchmark.ai.mode:cache}")
    private String modeConfig;

    private Mode mode = Mode.CACHE;

    @PostConstruct
    void init() {
        try {
            mode = Mode.valueOf(modeConfig.trim().toUpperCase());
        } catch (Exception e) {
            log.warn("benchmark.ai.mode='{}' không hợp lệ, dùng mặc định CACHE", modeConfig);
            mode = Mode.CACHE;
        }
        log.info("Benchmark AI đang chạy ở chế độ: {}", mode);
    }

    public BenchmarkAiSuggestionResponse researchMarketBenchmark(BenchmarkAiResearchRequest request) {
        return switch (mode) {
            case CACHE -> fromCache(request);
            case LIVE -> liveService.researchMarketBenchmark(request);
            case AUTO -> {
                try {
                    yield liveService.researchMarketBenchmark(request);
                } catch (RuntimeException e) {
                    log.warn("AI live lỗi, thử lấy từ cache: {}", e.getMessage());
                    yield cacheStore.find(request.itemName(), request.unit()).orElseThrow(() -> e);
                }
            }
        };
    }

    private BenchmarkAiSuggestionResponse fromCache(BenchmarkAiResearchRequest request) {
        return cacheStore.find(request.itemName(), request.unit())
                .map(r -> {
                    log.info("[CACHE] Trả dữ liệu mẫu cho '{}'", request.itemName());
                    return r;
                })
                .orElseThrow(() -> new IllegalStateException(
                        "Chưa có dữ liệu tra cứu mẫu cho '" + request.itemName() + "'."));
    }
}