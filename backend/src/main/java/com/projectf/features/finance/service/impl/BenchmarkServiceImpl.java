package com.projectf.features.finance.service.impl;

import com.projectf.features.finance.dto.request.CreateBenchmarkRequest;
import com.projectf.features.finance.dto.request.UpdateBenchmarkRequest;
import com.projectf.features.finance.dto.response.BenchmarkResponse;
import com.projectf.features.finance.entity.ItemPriceBenchmark;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.BudgetCategoryRepository;
import com.projectf.features.finance.repository.ItemPriceBenchmarkRepository;
import com.projectf.features.finance.service.BenchmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class BenchmarkServiceImpl implements BenchmarkService {

  private static final String BENCHMARK = "đơn giá tham chiếu";

  private final ItemPriceBenchmarkRepository benchmarkRepo;
  private final BudgetCategoryRepository categoryRepo;
  private final FinanceMapper mapper;

  private static IllegalArgumentException notFound(String entity, UUID id) {
    return new IllegalArgumentException("Không tìm thấy " + entity + " với ID: " + id);
  }

  private static IllegalArgumentException alreadyExists(String detail) {
    return new IllegalArgumentException(detail + " đã tồn tại.");
  }

  private static IllegalArgumentException linkedNotExist(String entity, UUID id) {
    return new IllegalArgumentException(entity + " không tồn tại: " + id);
  }

  @Override
  @Transactional(readOnly = true)
  public List<BenchmarkResponse> getAllBenchmarks(UUID categoryId, String keyword) {
    List<ItemPriceBenchmark> list;
    if (categoryId != null) {
      list = benchmarkRepo.findByCategoryId(categoryId);
    } else if (keyword != null && !keyword.isBlank()) {
      list = benchmarkRepo.findByItemNameContainingIgnoreCase(keyword.trim());
    } else {
      list = benchmarkRepo.findAll();
    }
    return list.stream().map(mapper::toResponse).toList();
  }

  @Override
  @Transactional(readOnly = true)
  public BenchmarkResponse getBenchmarkById(UUID id) {
    return benchmarkRepo.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> notFound(BENCHMARK, id));
  }

  @Override
  public BenchmarkResponse createBenchmark(CreateBenchmarkRequest request) {
    if (!categoryRepo.existsById(request.categoryId())) {
      throw linkedNotExist("Danh mục kinh phí liên kết", request.categoryId());
    }
    String itemName = request.itemName().trim();
    String unit = request.unit().trim();
    if (benchmarkRepo.existsByItemNameIgnoreCaseAndUnitIgnoreCase(itemName, unit)) {
      throw alreadyExists("Đơn giá benchmark cho '" + itemName + "' với đơn vị '" + unit + "'");
    }
    ItemPriceBenchmark entity = mapper.toEntity(request);
    return mapper.toResponse(benchmarkRepo.save(entity));
  }

  @Override
  public BenchmarkResponse updateBenchmark(UUID id, UpdateBenchmarkRequest request) {
    ItemPriceBenchmark entity = benchmarkRepo.findById(id)
            .orElseThrow(() -> notFound(BENCHMARK, id));

    if (!categoryRepo.existsById(request.categoryId())) {
      throw linkedNotExist("Danh mục kinh phí liên kết", request.categoryId());
    }
    String itemName = request.itemName().trim();
    String unit = request.unit().trim();
    if (benchmarkRepo.existsByItemNameIgnoreCaseAndUnitIgnoreCaseAndIdNot(itemName, unit, id)) {
      throw alreadyExists("Đơn giá benchmark khác cho '" + itemName + "' với đơn vị '" + unit + "'");
    }
    mapper.updateEntity(entity, request);
    return mapper.toResponse(benchmarkRepo.save(entity));
  }

  @Override
  public void deleteBenchmark(UUID id) {
    if (!benchmarkRepo.existsById(id)) {
      throw notFound(BENCHMARK, id);
    }
    benchmarkRepo.deleteById(id);
  }
}