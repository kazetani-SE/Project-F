package com.projectf.features.finance.service;

import com.projectf.features.finance.dto.request.CreateBenchmarkRequest;
import com.projectf.features.finance.dto.request.UpdateBenchmarkRequest;
import com.projectf.features.finance.dto.response.BenchmarkResponse;

import java.util.List;
import java.util.UUID;

public interface BenchmarkService {
  List<BenchmarkResponse> getAllBenchmarks(UUID categoryId, String keyword);
  BenchmarkResponse getBenchmarkById(UUID id);
  BenchmarkResponse createBenchmark(CreateBenchmarkRequest request);
  BenchmarkResponse updateBenchmark(UUID id, UpdateBenchmarkRequest request);
  void deleteBenchmark(UUID id);
}