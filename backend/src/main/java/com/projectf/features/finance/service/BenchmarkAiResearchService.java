package com.projectf.features.finance.service;

import com.projectf.features.finance.dto.request.BenchmarkAiResearchRequest;
import com.projectf.features.finance.dto.response.BenchmarkAiSuggestionResponse;

public interface BenchmarkAiResearchService {

    BenchmarkAiSuggestionResponse researchMarketBenchmark(BenchmarkAiResearchRequest request);
}
