package com.projectf.features.finance.service.impl;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.exception.finance.DeletedCategoriesException;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.finance.dto.request.AutoProjectBudgetRequest;
import com.projectf.features.finance.dto.request.CategoryReplacementRequest;
import com.projectf.features.finance.dto.request.CreateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.dto.request.ReviewBudgetItemRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetItemRequest;
import com.projectf.features.finance.dto.response.BudgetCategoryResponse;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.dto.response.CategoryReplacementOptionsResponse;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BudgetItemServiceImpl implements BudgetItemService {

  private static final String CATEGORY = "danh mục kinh phí";
  private static final String BUDGET_ITEM = "hạng mục dự trù";
  private static final String EVENT = "sự kiện";

  private final EventRepository eventRepo;
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

  /**
   * Danh mục đã soft delete: vẫn hiển thị ở item cũ nhưng không được gắn vào item
   * mới.
   */
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

  private Event requireEvent(UUID eventId) {
    return eventRepo.findById(eventId).orElseThrow(() -> notFound(EVENT, eventId));
  }

  /** Event phải tồn tại và item phải thuộc đúng event này. */
  private BudgetItem requireItem(UUID eventId, UUID id) {
    requireEvent(eventId);
    return budgetItemRepo.findByIdAndEventId(id, eventId)
            .orElseThrow(() -> notFound(BUDGET_ITEM, id));
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

  /**
   * Trả về cả danh mục đã soft delete để item cũ vẫn hiển thị được danh mục của
   * nó.
   */
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
    BudgetCategory entity = categoryRepo.findById(id).orElseThrow(() -> notFound(CATEGORY, id));
    if (isDeleted(entity)) {
      throw new IllegalArgumentException(
              "Danh mục kinh phí '" + entity.getName() + "' đã ngừng sử dụng, không thể cập nhật.");
    }
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
    requireEvent(eventId);
    List<BudgetItem> list = (status != null)
        ? budgetItemRepo.findByEventIdAndApprovalStatus(eventId, status)
        : budgetItemRepo.findByEventId(eventId);
    return list.stream().map(mapper::toResponse).toList();
  }

  @Override
  @Transactional(readOnly = true)
  public BudgetItemResponse getBudgetItemById(UUID eventId, UUID id) {
    return mapper.toResponse(requireItem(eventId, id));
  }

  @Override
  public BudgetItemResponse createBudgetItem(UUID eventId, CreateBudgetItemRequest request) {
    requireEvent(eventId);
    assertCategoryAssignable(request.categoryId());

    BudgetItem entity = mapper.toEntity(eventId, request);
    return mapper.toResponse(budgetItemRepo.save(entity));
  }

  @Override
  public BudgetItemResponse updateBudgetItem(UUID eventId, UUID id, UpdateBudgetItemRequest request) {
    BudgetItem entity = requireItem(eventId, id);

    // Giữ nguyên danh mục cũ (kể cả đã soft delete) thì không cần kiểm tra,
    // chỉ kiểm tra khi đổi sang danh mục khác.
    if (!request.categoryId().equals(entity.getCategoryId())) {
      assertCategoryAssignable(request.categoryId());
    }

    mapper.updateEntity(entity, request);
    return mapper.toResponse(budgetItemRepo.save(entity));
  }

  @Override
  public BudgetItemResponse reviewBudgetItem(UUID eventId, UUID id, ReviewBudgetItemRequest request) {
    BudgetItem entity = requireItem(eventId, id);

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
  public void deleteBudgetItem(UUID eventId, UUID id) {
    BudgetItem entity = requireItem(eventId, id);

    if (entity.getApprovalStatus() == ApprovalStatus.APPROVED) {
      throw new IllegalArgumentException("Không thể xóa hạng mục dự trù đã được duyệt.");
    }
    budgetItemRepo.delete(entity);
  }

  // ========================================================================
  // 3. DỰ TOÁN TỰ ĐỘNG TỪ MÙA TRƯỚC (AUTO-PROJECTION)
  // ========================================================================

  /** Kiểm tra điều kiện kế thừa: event tồn tại, khác nhau, cùng series, event đích chưa có item. */
  private void validateProjectionSource(UUID eventId, UUID previousEventId) {
    if (eventId.equals(previousEventId)) {
      throw new IllegalArgumentException("Mùa trước phải khác sự kiện hiện tại.");
    }
    Event target = requireEvent(eventId);
    Event previous = requireEvent(previousEventId);

    if (target.getSeriesId() == null || !target.getSeriesId().equals(previous.getSeriesId())) {
      throw new IllegalArgumentException("Hai sự kiện không thuộc cùng một chuỗi sự kiện.");
    }
    if (budgetItemRepo.existsByEventId(eventId)) {
      throw new IllegalArgumentException(
              "Sự kiện đã có hạng mục dự trù, không thể kế thừa dự toán từ mùa trước.");
    }
  }

  @Override
  @Transactional(readOnly = true)
  public List<ProjectedBudgetResponse> getProjectedBudgetPreview(UUID eventId, UUID previousEventId) {
    validateProjectionSource(eventId, previousEventId);
    return projectedViewRepo.findByPreviousEventId(previousEventId).stream()
            .map(mapper::toResponse)
            .toList();
  }

  @Override
  public List<BudgetItemResponse> autoProjectFromPreviousSeason(UUID eventId, AutoProjectBudgetRequest request) {
    validateProjectionSource(eventId, request.previousEventId());

    List<ProjectedBudgetView> projections = projectedViewRepo.findByPreviousEventId(request.previousEventId());
    if (projections.isEmpty()) {
      throw notFound("dữ liệu dự trù/thực chi đã duyệt ở mùa trước", request.previousEventId());
    }

    Map<UUID, UUID> replacements = buildReplacementMap(request.cateReplacements());
    assertProjectionCategoriesActive(projections, replacements);

    List<BudgetItem> itemsToSave = projections.stream()
            .map(p -> buildProjectedItem(p, eventId, request,
                    replacements.getOrDefault(p.getCategoryId(), p.getCategoryId())))
            .toList();

    return budgetItemRepo.saveAll(itemsToSave).stream().map(mapper::toResponse).toList();
  }

  /** Gộp cặp thay thế thành map; chặn trùng oldId và chặn newId không dùng được. */
  private Map<UUID, UUID> buildReplacementMap(List<CategoryReplacementRequest> list) {
    Map<UUID, UUID> map = new HashMap<>();
    if (list != null) {
      for (CategoryReplacementRequest r : list) {
        if (map.put(r.oldCategoryId(), r.newCategoryId()) != null) {
          throw new IllegalArgumentException("Danh mục cũ bị thay thế nhiều lần: " + r.oldCategoryId());
        }
        assertCategoryAssignable(r.newCategoryId()); // tồn tại và chưa soft delete
      }
    }
    return map;
  }

  /**
   * Nếu sau khi áp thay thế mà vẫn còn danh mục đã soft delete thì ném
   * DeletedCategoriesException (message = các UUID, xem ghi chú FE).
   */
  private void assertProjectionCategoriesActive(List<ProjectedBudgetView> projections,
                                                Map<UUID, UUID> replacements) {
    Set<UUID> effectiveIds = projections.stream()
            .map(p -> replacements.getOrDefault(p.getCategoryId(), p.getCategoryId()))
            .collect(Collectors.toSet());

    List<UUID> deletedIds = categoryRepo.findAllById(effectiveIds).stream()
            .filter(BudgetItemServiceImpl::isDeleted)
            .map(BudgetCategory::getId)
            .toList();

    if (!deletedIds.isEmpty()) {
      throw new DeletedCategoriesException(deletedIds);
    }
  }

  private BudgetItem buildProjectedItem(ProjectedBudgetView prjBudgetView, UUID eventId,
                                        AutoProjectBudgetRequest request, UUID categoryId) {
    BudgetItem item = new BudgetItem();
    item.setEventId(eventId);
    item.setCategoryId(categoryId);
    item.setBenchmarkId(prjBudgetView.getBenchmarkId());
    item.setItemName(prjBudgetView.getItemName());
    item.setUnit(prjBudgetView.getUnit());
    item.setQuantity(prjBudgetView.getBaseProjectionQty() != null ? prjBudgetView.getBaseProjectionQty() : BigDecimal.ONE);
    item.setEstUnitPrice(prjBudgetView.getAdjustedUnitPrice() != null ? prjBudgetView.getAdjustedUnitPrice() : BigDecimal.ZERO);
    item.setNotes("Dự toán tự động kế thừa từ mùa trước (Sự kiện ID: " + request.previousEventId() + ")");
    item.setApprovalStatus(ApprovalStatus.PENDING);
    return item;
  }

  @Override
  @Transactional(readOnly = true)
  public CategoryReplacementOptionsResponse getCategoryReplacementOptions(List<UUID> deletedCateIds) {
    List<BudgetCategoryResponse> deleted = categoryRepo.findAllById(deletedCateIds).stream()
            .map(mapper::toResponse).toList();
    List<BudgetCategoryResponse> active = categoryRepo.findByDeletedAtIsNull().stream()
            .map(mapper::toResponse).toList();
    return new CategoryReplacementOptionsResponse(deleted, active);
  }

  // ========================================================================
  // 4. REAL-TIME BUDGET DASHBOARD SUMMARY
  // ========================================================================

  @Override
  @Transactional(readOnly = true)
  public EventBudgetSummaryResponse getBudgetSummary(UUID eventId) {
    requireEvent(eventId);
    return summaryViewRepo.findById(eventId)
            .map(mapper::toResponse)
            .orElseThrow(() -> notFound("dữ liệu tổng hợp ngân sách cho sự kiện", eventId));
  }
}