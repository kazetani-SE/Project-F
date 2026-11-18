package com.projectf.features.finance.service;

import com.projectf.features.finance.dto.request.BenchmarkAiResearchRequest;
import com.projectf.features.finance.dto.response.BenchmarkAiSuggestionResponse;

@FunctionalInterface
public interface BenchmarkAiResearchService {

    BenchmarkAiSuggestionResponse researchMarketBenchmark(BenchmarkAiResearchRequest request);
}
