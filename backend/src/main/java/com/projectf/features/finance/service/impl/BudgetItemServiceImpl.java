package com.projectf.features.finance.service.impl;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.features.finance.dto.request.AutoProjectBudgetRequest;
import com.projectf.features.finance.dto.request.CreateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.dto.request.ReviewBudgetItemRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetItemRequest;
import com.projectf.features.finance.dto.response.BudgetCategoryResponse;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.dto.response.EventBudgetSummaryResponse;
import com.projectf.features.finance.dto.response.ProjectedBudgetResponse;
import com.projectf.features.finance.entity.BudgetCategory;
import com.projectf.features.finance.entity.BudgetItem;
import com.projectf.features.finance.entity.ProjectedBudgetView;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.BudgetCategoryRepository;
import com.projectf.features.finance.repository.BudgetItemRepository;
import com.projectf.features.finance.repository.EventBudgetSummaryViewRepository;
import com.projectf.features.finance.repository.ItemPriceBenchmarkRepository;
import com.projectf.features.finance.repository.ProjectedBudgetViewRepository;
import com.projectf.features.finance.service.BudgetItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BudgetItemServiceImpl implements BudgetItemService {

  private static final String CATEGORY = "danh mục kinh phí";
  private static final String BUDGET_ITEM = "hạng mục dự trù";

  private final BudgetCategoryRepository categoryRepo;
  private final BudgetItemRepository budgetItemRepo;
  private final ItemPriceBenchmarkRepository benchmarkRepo;
  private final EventBudgetSummaryViewRepository summaryViewRepo;
  private final ProjectedBudgetViewRepository projectedViewRepo;
  private final FinanceMapper mapper;

  // ========================================================================
  // HELPERS
  // ========================================================================

  private static IllegalArgumentException notFound(String entity, UUID id) {
    return new IllegalArgumentException("Không tìm thấy " + entity + " với ID: " + id);
  }

  private static IllegalArgumentException alreadyExists(String detail) {
    return new IllegalArgumentException(detail + " đã tồn tại.");
  }

  private static IllegalArgumentException linkedNotExist(String entity, UUID id) {
    return new IllegalArgumentException(entity + " không tồn tại: " + id);
  }

  /** Danh mục đã soft delete: vẫn hiển thị ở item cũ nhưng không được gắn vào item mới. */
  private static boolean isDeleted(BudgetCategory category) {
    return category.getDeletedAt() != null;
  }

  /** Dùng khi gắn danh mục vào một hạng mục mới (hoặc đổi sang danh mục khác). */
  private void assertCategoryAssignable(UUID categoryId) {
    BudgetCategory category = categoryRepo.findById(categoryId)
            .orElseThrow(() -> linkedNotExist("Danh mục kinh phí", categoryId));
    if (isDeleted(category)) {
      throw new IllegalArgumentException(
              "Danh mục kinh phí '" + category.getName() + "' đã ngừng sử dụng, không thể gắn vào hạng mục mới.");
    }
  }

  // ========================================================================
  // 1. DANH MỤC KINH PHÍ (BUDGET CATEGORIES)
  // ========================================================================

  /** Chỉ trả về danh mục còn hoạt động (dùng cho dropdown chọn danh mục). */
  @Override
  @Transactional(readOnly = true)
  public List<BudgetCategoryResponse> getAllCategories() {
    return categoryRepo.findByDeletedAtIsNull().stream()
            .map(mapper::toResponse)
            .toList();
  }

  /** Trả về cả danh mục đã soft delete để item cũ vẫn hiển thị được danh mục của nó. */
  @Override
  @Transactional(readOnly = true)
  public BudgetCategoryResponse getCategoryById(UUID id) {
    return categoryRepo.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> notFound(CATEGORY, id));
  }

  @Override
  public BudgetCategoryResponse createCategory(CreateBudgetCategoryRequest request) {
    String name = request.name().trim();
    if (categoryRepo.existsByNameIgnoreCaseAndDeletedAtIsNull(name)) {
      throw alreadyExists("Danh mục kinh phí với tên '" + name + "'");
    }
    BudgetCategory entity = mapper.toEntity(request);
    return mapper.toResponse(categoryRepo.save(entity));
  }

  @Override
  public BudgetCategoryResponse updateCategory(UUID id, UpdateBudgetCategoryRequest request) {
    BudgetCategory entity = categoryRepo.findById(id)
            .orElseThrow(() -> notFound(CATEGORY, id));

    String name = request.name().trim();
    if (categoryRepo.existsByNameIgnoreCaseAndIdNotAndDeletedAtIsNull(name, id)) {
      throw alreadyExists("Danh mục kinh phí khác với tên '" + name + "'");
    }
    mapper.updateEntity(entity, request);
    return mapper.toResponse(categoryRepo.save(entity));
  }

  /**
   * Xóa danh mục:
   * - Chưa có hạng mục dự trù / định mức giá nào dùng -> xóa cứng.
   * - Đã có dùng -> soft delete (đặt deleted_at).
   */
  @Override
  public void deleteCategory(UUID id) {
    BudgetCategory entity = categoryRepo.findById(id)
            .orElseThrow(() -> notFound(CATEGORY, id));

    if (isDeleted(entity)) {
      return; // đã soft delete trước đó
    }

    boolean inUse = budgetItemRepo.existsByCategoryId(id) || benchmarkRepo.existsByCategoryId(id);
    if (inUse) {
      entity.setDeletedAt(OffsetDateTime.now());
      categoryRepo.save(entity);
    } else {
      categoryRepo.delete(entity);
    }
  }

  // ========================================================================
  // 2. DỰ TRÙ KINH PHÍ CHI TIẾT (BUDGET ITEMS)
  // ========================================================================

  @Override
  @Transactional(readOnly = true)
  public List<BudgetItemResponse> getBudgetItemsByEvent(UUID eventId, ApprovalStatus status) {
    List<BudgetItem> list = (status != null)
            ? budgetItemRepo.findByEventIdAndApprovalStatus(eventId, status)
            : budgetItemRepo.findByEventId(eventId);
    return list.stream().map(mapper::toResponse).toList();
  }

  @Override
  @Transactional(readOnly = true)
  public BudgetItemResponse getBudgetItemById(UUID id) {
    return budgetItemRepo.findById(id)
            .map(mapper::toResponse)
            .orElseThrow(() -> notFound(BUDGET_ITEM, id));
  }

  @Override
  public BudgetItemResponse createBudgetItem(CreateBudgetItemRequest request) {
    assertCategoryAssignable(request.categoryId());

    BudgetItem entity = mapper.toEntity(request);
    return mapper.toResponse(budgetItemRepo.save(entity));
  }

  @Override
  public BudgetItemResponse updateBudgetItem(UUID id, UpdateBudgetItemRequest request) {
    BudgetItem entity = budgetItemRepo.findById(id)
            .orElseThrow(() -> notFound(BUDGET_ITEM, id));

    // Giữ nguyên danh mục cũ (kể cả đã soft delete) thì không cần kiểm tra,
    // chỉ kiểm tra khi đổi sang danh mục khác.
    if (!request.categoryId().equals(entity.getCategoryId())) {
      assertCategoryAssignable(request.categoryId());
    }

    mapper.updateEntity(entity, request);
    return mapper.toResponse(budgetItemRepo.save(entity));
  }

  @Override
  public BudgetItemResponse reviewBudgetItem(UUID id, ReviewBudgetItemRequest request) {
    BudgetItem entity = budgetItemRepo.findById(id)
            .orElseThrow(() -> notFound(BUDGET_ITEM, id));

    entity.setApprovalStatus(request.status());
    if (request.status() == ApprovalStatus.APPROVED) {
      entity.setApprovedBy(request.approvedBy());
      entity.setApprovedAt(OffsetDateTime.now());
      entity.setRejectionReason(null);
    } else if (request.status() == ApprovalStatus.REJECTED) {
      entity.setApprovedBy(request.approvedBy());
      entity.setApprovedAt(OffsetDateTime.now());
      entity.setRejectionReason(request.rejectionReason());
    }
    return mapper.toResponse(budgetItemRepo.save(entity));
  }

  /** Chỉ chặn xóa hạng mục đã APPROVED; DRAFT, PENDING, REJECTED đều xóa được. */
  @Override
  public void deleteBudgetItem(UUID id) {
    BudgetItem entity = budgetItemRepo.findById(id)
            .orElseThrow(() -> notFound(BUDGET_ITEM, id));

    if (entity.getApprovalStatus() == ApprovalStatus.APPROVED) {
      throw new IllegalArgumentException("Không thể xóa hạng mục dự trù đã được duyệt.");
    }
    budgetItemRepo.delete(entity);
  }

  // ========================================================================
  // 3. DỰ TOÁN TỰ ĐỘNG TỪ MÙA TRƯỚC (AUTO-PROJECTION)
  // ========================================================================

  @Override
  @Transactional(readOnly = true)
  public List<ProjectedBudgetResponse> getProjectedBudgetPreview(UUID previousEventId) {
    return projectedViewRepo.findByPreviousEventId(previousEventId).stream()
            .map(mapper::toResponse)
            .toList();
  }

  @Override
  public List<BudgetItemResponse> autoProjectFromPreviousSeason(AutoProjectBudgetRequest request) {
    List<ProjectedBudgetView> projections = projectedViewRepo.findByPreviousEventId(request.previousEventId());
    if (projections.isEmpty()) {
      throw notFound("dữ liệu dự trù/thực chi đã duyệt ở mùa trước", request.previousEventId());
    }

    assertProjectionCategoriesActive(projections);

    List<BudgetItem> itemsToSave = projections.stream()
            .map(p -> buildProjectedItem(p, request))
            .toList();

    return budgetItemRepo.saveAll(itemsToSave).stream()
            .map(mapper::toResponse)
            .toList();
  }

  /** Item mới sinh ra từ mùa trước cũng không được gắn danh mục đã soft delete. */
  private void assertProjectionCategoriesActive(List<ProjectedBudgetView> projections) {
    Set<UUID> categoryIds = projections.stream()
            .map(ProjectedBudgetView::getCategoryId)
            .collect(Collectors.toSet());

    List<String> deletedNames = categoryRepo.findAllById(categoryIds).stream()
            .filter(BudgetItemServiceImpl::isDeleted)
            .map(BudgetCategory::getName)
            .toList();

    if (!deletedNames.isEmpty()) {
      throw new IllegalArgumentException(
              "Không thể kế thừa dự toán vì các danh mục kinh phí sau đã ngừng sử dụng: "
                      + String.join(", ", deletedNames));
    }
  }

  private BudgetItem buildProjectedItem(ProjectedBudgetView budgetView, AutoProjectBudgetRequest request) {
    BudgetItem item = new BudgetItem();
    item.setEventId(request.targetEventId());
    item.setCategoryId(budgetView.getCategoryId());
    item.setBenchmarkId(budgetView.getBenchmarkId());
    item.setItemName(budgetView.getItemName());
    item.setUnit(budgetView.getUnit());
    item.setQuantity(budgetView.getBaseProjectionQty() != null ? budgetView.getBaseProjectionQty() : BigDecimal.ONE);
    item.setEstUnitPrice(budgetView.getAdjustedUnitPrice() != null ? budgetView.getAdjustedUnitPrice() : BigDecimal.ZERO);
    item.setNotes("Dự toán tự động kế thừa từ mùa trước (Sự kiện ID: " + request.previousEventId() + ")");
    item.setApprovalStatus(ApprovalStatus.PENDING);
    return item;
  }

  // ========================================================================
  // 4. REAL-TIME BUDGET DASHBOARD SUMMARY
  // ========================================================================

  @Override
  @Transactional(readOnly = true)
  public EventBudgetSummaryResponse getBudgetSummary(UUID eventId) {
    return summaryViewRepo.findById(eventId)
            .map(mapper::toResponse)
            .orElseThrow(() -> notFound("dữ liệu tổng hợp ngân sách cho sự kiện", eventId));
  }
}