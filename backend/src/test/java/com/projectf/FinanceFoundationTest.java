package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.exception.finance.DeletedCategoriesException;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.finance.dto.request.AutoProjectBudgetRequest;
import com.projectf.features.finance.dto.request.CategoryReplacementRequest;
import com.projectf.features.finance.dto.request.CreateBudgetItemRequest;
import com.projectf.features.finance.dto.request.ReviewBudgetItemRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetCategoryRequest;
import com.projectf.features.finance.dto.request.UpdateBudgetItemRequest;
import com.projectf.features.finance.dto.request.UpdateBenchmarkRequest;
import com.projectf.features.finance.dto.response.BenchmarkResponse;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.dto.response.CategoryReplacementOptionsResponse;
import com.projectf.features.finance.entity.BudgetCategory;
import com.projectf.features.finance.entity.BudgetItem;
import com.projectf.features.finance.entity.ItemPriceBenchmark;
import com.projectf.features.finance.entity.ProjectedBudgetView;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.BudgetCategoryRepository;
import com.projectf.features.finance.repository.BudgetItemRepository;
import com.projectf.features.finance.repository.EventBudgetSummaryViewRepository;
import com.projectf.features.finance.repository.ItemPriceBenchmarkRepository;
import com.projectf.features.finance.repository.ExpenseRepository;
import com.projectf.features.finance.repository.ProjectedBudgetViewRepository;
import com.projectf.features.finance.service.impl.BenchmarkServiceImpl;
import com.projectf.features.finance.service.impl.BudgetItemServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FinanceFoundationTest {

    @Mock
    private EventRepository eventRepo;
    @Mock
    private BudgetCategoryRepository categoryRepo;
    @Mock
    private BudgetItemRepository budgetItemRepo;
    @Mock
    private ItemPriceBenchmarkRepository benchmarkRepo;
    @Mock
    private ExpenseRepository expenseRepo;
    @Mock
    private EventBudgetSummaryViewRepository summaryViewRepo;
    @Mock
    private ProjectedBudgetViewRepository projectedViewRepo;

    private BudgetItemServiceImpl service;

    private final UUID eventId = UUID.randomUUID();
    private final UUID previousEventId = UUID.randomUUID();
    private final UUID seriesId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new BudgetItemServiceImpl(eventRepo, categoryRepo, budgetItemRepo,
                benchmarkRepo, expenseRepo, summaryViewRepo, projectedViewRepo, new FinanceMapper());
    }

    // ---------------------------------------------------------------- helpers

    private Event event(UUID id, UUID series) {
        Event e = new Event();
        e.setId(id);
        e.setSeriesId(series);
        return e;
    }

    private BudgetCategory category(UUID id, String name, boolean deleted) {
        BudgetCategory c = new BudgetCategory();
        c.setId(id);
        c.setName(name);
        if (deleted) {
            c.setDeletedAt(OffsetDateTime.now());
        }
        return c;
    }

    private ProjectedBudgetView projection(UUID categoryId) {
        ProjectedBudgetView v = mock(ProjectedBudgetView.class);
        when(v.getCategoryId()).thenReturn(categoryId);
        when(v.getItemName()).thenReturn("Standee");
        when(v.getUnit()).thenReturn("Cái");
        return v;
    }

    /** Event đích và mùa trước cùng series, đích chưa có item: điều kiện hợp lệ. */
    private void stubValidProjectionSource() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(eventRepo.findById(previousEventId)).thenReturn(Optional.of(event(previousEventId, seriesId)));
        when(budgetItemRepo.existsByEventId(eventId)).thenReturn(false);
    }

    private IllegalArgumentException assertIllegalArg(org.junit.jupiter.api.function.Executable e) {
        return assertThrows(IllegalArgumentException.class, e);
    }

    // ------------------------------------------------------------- category

    @Test
    void updateCategoryRejectsSoftDeletedCategory() {
        UUID id = UUID.randomUUID();
        when(categoryRepo.findById(id)).thenReturn(Optional.of(category(id, "Cũ", true)));

        var ex = assertIllegalArg(() -> service.updateCategory(id, new UpdateBudgetCategoryRequest("Mới", null)));

        assertTrue(ex.getMessage().contains("đã ngừng sử dụng"));
        verify(categoryRepo, never()).save(any());
    }

    @Test
    void deleteCategorySoftDeletesWhenInUse() {
        UUID id = UUID.randomUUID();
        BudgetCategory c = category(id, "Hậu cần", false);
        when(categoryRepo.findById(id)).thenReturn(Optional.of(c));
        when(budgetItemRepo.existsByCategoryId(id)).thenReturn(true);

        service.deleteCategory(id);

        assertNotNull(c.getDeletedAt());
        verify(categoryRepo).save(c);
        verify(categoryRepo, never()).delete(any());
    }

    @Test
    void deleteCategoryHardDeletesWhenUnused() {
        UUID id = UUID.randomUUID();
        BudgetCategory c = category(id, "Hậu cần", false);
        when(categoryRepo.findById(id)).thenReturn(Optional.of(c));
        when(budgetItemRepo.existsByCategoryId(id)).thenReturn(false);
        when(benchmarkRepo.existsByCategoryId(id)).thenReturn(false);

        service.deleteCategory(id);

        verify(categoryRepo).delete(c);
    }

    // ---------------------------------------------------------- budget item

    @Test
    void getBudgetItemsThrowsWhenEventNotFound() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.empty());

        var ex = assertIllegalArg(() -> service.getBudgetItemsByEvent(eventId, null));

        assertTrue(ex.getMessage().contains(eventId.toString()));
        verify(budgetItemRepo, never()).findByEventId(any());
    }

    @Test
    void getBudgetItemThrowsWhenItemBelongsToAnotherEvent() {
        UUID itemId = UUID.randomUUID();
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.empty());

        assertIllegalArg(() -> service.getBudgetItemById(eventId, itemId));
    }

    @Test
    void createBudgetItemThrowsWhenEventNotFound() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.empty());

        assertIllegalArg(() -> service.createBudgetItem(eventId, null));
        verify(budgetItemRepo, never()).save(any());
    }

    @Test
    void deleteBudgetItemRejectsApprovedItem() {
        UUID itemId = UUID.randomUUID();
        BudgetItem item = new BudgetItem();
        item.setId(itemId);
        item.setEventId(eventId);
        item.setApprovalStatus(ApprovalStatus.APPROVED);
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.of(item));

        var ex = assertIllegalArg(() -> service.deleteBudgetItem(eventId, itemId));

        assertTrue(ex.getMessage().contains("đã được duyệt"));
        verify(budgetItemRepo, never()).delete(any());
    }

    @Test
    void deleteBudgetItemSucceedsForPendingItem() {
        UUID itemId = UUID.randomUUID();
        BudgetItem item = new BudgetItem();
        item.setId(itemId);
        item.setEventId(eventId);
        item.setApprovalStatus(ApprovalStatus.PENDING);
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.of(item));

        service.deleteBudgetItem(eventId, itemId);

        verify(budgetItemRepo).delete(item);
    }

    @Test
    void getBudgetSummaryThrowsWhenEventNotFound() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.empty());

        assertIllegalArg(() -> service.getBudgetSummary(eventId));
        verify(summaryViewRepo, never()).findById(any());
    }

    // ------------------------------------------------------ auto projection

    @Test
    void autoProjectRejectsSameEvent() {
        var ex = assertIllegalArg(
                () -> service.autoProjectFromPreviousSeason(eventId, new AutoProjectBudgetRequest(eventId, null)));

        assertTrue(ex.getMessage().contains("khác"));
        verify(budgetItemRepo, never()).saveAll(any());
    }

    @Test
    void autoProjectRejectsDifferentSeries() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(eventRepo.findById(previousEventId))
                .thenReturn(Optional.of(event(previousEventId, UUID.randomUUID())));

        var ex = assertIllegalArg(() -> service.autoProjectFromPreviousSeason(
                eventId, new AutoProjectBudgetRequest(previousEventId, null)));

        assertTrue(ex.getMessage().contains("chuỗi sự kiện"));
    }

    @Test
    void autoProjectRejectsWhenBothEventsHaveNoSeries() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, null)));
        when(eventRepo.findById(previousEventId)).thenReturn(Optional.of(event(previousEventId, null)));

        assertIllegalArg(() -> service.autoProjectFromPreviousSeason(
                eventId, new AutoProjectBudgetRequest(previousEventId, null)));
    }

    @Test
    void autoProjectRejectsWhenTargetEventAlreadyHasBudgetItems() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(eventRepo.findById(previousEventId)).thenReturn(Optional.of(event(previousEventId, seriesId)));
        when(budgetItemRepo.existsByEventId(eventId)).thenReturn(true);

        var ex = assertIllegalArg(() -> service.autoProjectFromPreviousSeason(
                eventId, new AutoProjectBudgetRequest(previousEventId, null)));

        assertTrue(ex.getMessage().contains("đã có hạng mục dự trù"));
        verify(budgetItemRepo, never()).saveAll(any());
    }

    @Test
    void previewAppliesSameValidationAsProject() {
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(eventRepo.findById(previousEventId))
                .thenReturn(Optional.of(event(previousEventId, UUID.randomUUID())));

        assertIllegalArg(() -> service.getProjectedBudgetPreview(eventId, previousEventId));
        verify(projectedViewRepo, never()).findByPreviousEventId(any());
    }

    @Test
    void autoProjectThrowsWhenNoProjectionData() {
        stubValidProjectionSource();
        when(projectedViewRepo.findByPreviousEventId(previousEventId)).thenReturn(List.of());

        assertIllegalArg(() -> service.autoProjectFromPreviousSeason(
                eventId, new AutoProjectBudgetRequest(previousEventId, null)));
    }

    @Test
    void autoProjectThrowsDeletedCategoriesExceptionWithUuidOnlyMessage() {
        stubValidProjectionSource();
        UUID deletedA = UUID.randomUUID();
        UUID deletedB = UUID.randomUUID();
        ProjectedBudgetView pA = projection(deletedA);
        ProjectedBudgetView pB = projection(deletedB);
        when(projectedViewRepo.findByPreviousEventId(previousEventId)).thenReturn(List.of(pA, pB));
        when(categoryRepo.findAllById(any())).thenReturn(List.of(
                category(deletedA, "A", true), category(deletedB, "B", true)));

        var ex = assertThrows(DeletedCategoriesException.class, () -> service.autoProjectFromPreviousSeason(
                eventId, new AutoProjectBudgetRequest(previousEventId, null)));

        // FE nhận ra lỗi này khi message chỉ gồm các UUID cách nhau bằng dấu phẩy
        assertTrue(ex.getMessage()
                .matches("^[0-9a-fA-F-]{36}(,[0-9a-fA-F-]{36})*$"));
        assertTrue(ex.getCategoryIds().containsAll(List.of(deletedA, deletedB)));
        assertEquals(2, ex.getCategoryIds().size());
        verify(budgetItemRepo, never()).saveAll(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void autoProjectUsesReplacementCategoryAndSavesPendingItems() {
        stubValidProjectionSource();
        UUID oldCat = UUID.randomUUID();
        UUID newCat = UUID.randomUUID();
        ProjectedBudgetView p = projection(oldCat);
        when(projectedViewRepo.findByPreviousEventId(previousEventId)).thenReturn(List.of(p));
        when(categoryRepo.findById(newCat)).thenReturn(Optional.of(category(newCat, "Mới", false)));
        // sau khi thay thế, chỉ còn newCat được kiểm tra và nó còn hoạt động
        when(categoryRepo.findAllById(any())).thenReturn(List.of(category(newCat, "Mới", false)));
        when(budgetItemRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<BudgetItemResponse> result = service.autoProjectFromPreviousSeason(eventId,
                new AutoProjectBudgetRequest(previousEventId,
                        List.of(new CategoryReplacementRequest(oldCat, newCat))));

        assertEquals(1, result.size());

        ArgumentCaptor<List<BudgetItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(budgetItemRepo).saveAll(captor.capture());
        BudgetItem saved = captor.getValue().get(0);
        assertEquals(newCat, saved.getCategoryId());
        assertEquals(eventId, saved.getEventId());
        assertEquals(ApprovalStatus.PENDING, saved.getApprovalStatus());
        assertEquals(0, java.math.BigDecimal.ONE.compareTo(saved.getQuantity())); // mặc định 1
        assertEquals(0, java.math.BigDecimal.ZERO.compareTo(saved.getEstUnitPrice())); // mặc định 0
        assertTrue(saved.getNotes().contains(previousEventId.toString()));
    }

    @Test
    void autoProjectRejectsReplacementPointingToDeletedCategory() {
        stubValidProjectionSource();
        UUID oldCat = UUID.randomUUID();
        UUID deletedNewCat = UUID.randomUUID();
        ProjectedBudgetView p = projection(oldCat);
        when(projectedViewRepo.findByPreviousEventId(previousEventId)).thenReturn(List.of(p));
        when(categoryRepo.findById(deletedNewCat))
                .thenReturn(Optional.of(category(deletedNewCat, "Đã xóa", true)));

        assertIllegalArg(() -> service.autoProjectFromPreviousSeason(eventId,
                new AutoProjectBudgetRequest(previousEventId,
                        List.of(new CategoryReplacementRequest(oldCat, deletedNewCat)))));
        verify(budgetItemRepo, never()).saveAll(any());
    }

    @Test
    void autoProjectRejectsDuplicateOldCategoryInReplacements() {
        stubValidProjectionSource();
        UUID oldCat = UUID.randomUUID();
        UUID new1 = UUID.randomUUID();
        UUID new2 = UUID.randomUUID();
        ProjectedBudgetView p = projection(oldCat);
        when(projectedViewRepo.findByPreviousEventId(previousEventId)).thenReturn(List.of(p));
        when(categoryRepo.findById(new1)).thenReturn(Optional.of(category(new1, "1", false)));
        when(categoryRepo.findById(new2)).thenReturn(Optional.of(category(new2, "2", false)));

        var ex = assertIllegalArg(() -> service.autoProjectFromPreviousSeason(eventId,
                new AutoProjectBudgetRequest(previousEventId, List.of(
                        new CategoryReplacementRequest(oldCat, new1),
                        new CategoryReplacementRequest(oldCat, new2)))));

        assertTrue(ex.getMessage().contains("nhiều lần"));
    }

    @Test
    void autoProjectStillReportsRemainingDeletedCategoriesAfterPartialReplacement() {
        stubValidProjectionSource();
        UUID deletedA = UUID.randomUUID();
        UUID deletedB = UUID.randomUUID();
        UUID newCat = UUID.randomUUID();
        ProjectedBudgetView pA = projection(deletedA);
        ProjectedBudgetView pB = projection(deletedB);
        when(projectedViewRepo.findByPreviousEventId(previousEventId)).thenReturn(List.of(pA, pB));
        when(categoryRepo.findById(newCat)).thenReturn(Optional.of(category(newCat, "Mới", false)));
        // chỉ thay deletedA; deletedB vẫn còn đã xóa
        when(categoryRepo.findAllById(any())).thenReturn(List.of(
                category(newCat, "Mới", false), category(deletedB, "B", true)));

        var ex = assertThrows(DeletedCategoriesException.class, () -> service.autoProjectFromPreviousSeason(
                eventId, new AutoProjectBudgetRequest(previousEventId,
                        List.of(new CategoryReplacementRequest(deletedA, newCat)))));

        assertEquals(List.of(deletedB), ex.getCategoryIds());
        assertEquals(deletedB.toString(), ex.getMessage());
    }

    // ------------------------------------------------- replacement options

    @Test
    void replacementOptionsReturnsDeletedAndActiveCategories() {
        UUID deletedId = UUID.randomUUID();
        UUID activeId = UUID.randomUUID();
        when(categoryRepo.findAllById(List.of(deletedId)))
                .thenReturn(List.of(category(deletedId, "Cũ", true)));
        when(categoryRepo.findByDeletedAtIsNull())
                .thenReturn(List.of(category(activeId, "Hiện tại", false)));

        CategoryReplacementOptionsResponse res = service.getCategoryReplacementOptions(List.of(deletedId));

        assertEquals(1, res.deletedCategories().size());
        assertEquals(deletedId, res.deletedCategories().get(0).id());
        assertEquals(1, res.activeCategories().size());
        assertEquals(activeId, res.activeCategories().get(0).id());
    }

    // ------------------------------------------------- locking by approved expense

    @Test
    void budgetItemLockedByApprovedExpenseRejectsUpdateReviewDelete() {
        UUID itemId = UUID.randomUUID();
        BudgetItem item = new BudgetItem();
        item.setId(itemId);
        item.setEventId(eventId);
        item.setCategoryId(UUID.randomUUID());
        item.setItemName("Bút dạ");
        item.setQuantity(new java.math.BigDecimal("10"));
        item.setUnit("Cây");
        item.setEstUnitPrice(new java.math.BigDecimal("5000"));
        item.setApprovalStatus(ApprovalStatus.APPROVED);

        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.of(item));
        when(expenseRepo.existsByBudgetItemIdAndStatus(itemId, ApprovalStatus.APPROVED)).thenReturn(true);

        // Update should throw
        var updateReq = new UpdateBudgetItemRequest(item.getCategoryId(), null, null, "Bút dạ mới",
                new java.math.BigDecimal("15"), "Cây", new java.math.BigDecimal("6000"), null);
        var exUpdate = assertThrows(IllegalArgumentException.class,
                () -> service.updateBudgetItem(eventId, itemId, updateReq));
        assertTrue(exUpdate.getMessage().contains("APPROVED"));

        // Review should throw
        var reviewReq = new ReviewBudgetItemRequest(ApprovalStatus.PENDING, null, null);
        var exReview = assertThrows(IllegalArgumentException.class,
                () -> service.reviewBudgetItem(eventId, itemId, reviewReq));
        assertTrue(exReview.getMessage().contains("APPROVED"));

        // Delete should throw
        var exDelete = assertThrows(IllegalArgumentException.class,
                () -> service.deleteBudgetItem(eventId, itemId));
        assertTrue(exDelete.getMessage().contains("APPROVED"));
    }

    // ------------------------------------------------- auto-create / link benchmark

    @Test
    void createBudgetItemWithoutBenchmark_throwsIfSupplierNameMissing() {
        UUID catId = UUID.randomUUID();
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(categoryRepo.findById(catId)).thenReturn(Optional.of(category(catId, "Hậu cần", false)));

        var reqWithoutSupplier = new CreateBudgetItemRequest(catId, null, null, "Bàn ghế",
                new java.math.BigDecimal("2"), "Bộ", new java.math.BigDecimal("100000"), "Notes", null, null);

        var ex = assertThrows(IllegalArgumentException.class,
                () -> service.createBudgetItem(eventId, reqWithoutSupplier));
        assertTrue(ex.getMessage().contains("nhà cung cấp"));
    }

    @Test
    void createBudgetItemWithoutBenchmark_createsNewBenchmarkIfNotExist() {
        UUID catId = UUID.randomUUID();
        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(categoryRepo.findById(catId)).thenReturn(Optional.of(category(catId, "Hậu cần", false)));
        when(benchmarkRepo.findByItemNameAndUnitTrimmedIgnoreCase(anyString(), anyString())).thenReturn(List.of());

        UUID newBmId = UUID.randomUUID();
        when(benchmarkRepo.save(any(ItemPriceBenchmark.class))).thenAnswer(inv -> {
            ItemPriceBenchmark b = inv.getArgument(0);
            b.setId(newBmId);
            b.setLastUpdatedAt(OffsetDateTime.now());
            return b;
        });
        when(budgetItemRepo.save(any(BudgetItem.class))).thenAnswer(inv -> {
            BudgetItem bi = inv.getArgument(0);
            bi.setId(UUID.randomUUID());
            return bi;
        });

        var req = new CreateBudgetItemRequest(catId, null, null, " Bàn ghế gấp ",
                new java.math.BigDecimal("2"), " Bộ ", new java.math.BigDecimal("150000"), null, " Cửa hàng nội thất A ", "https://noithat.vn");

        BudgetItemResponse response = service.createBudgetItem(eventId, req);

        assertNotNull(response);
        assertEquals(newBmId, response.benchmarkId());
        assertNotNull(response.benchmark());
        assertEquals("Cửa hàng nội thất A", response.benchmark().supplierName());
        assertEquals("https://noithat.vn", response.benchmark().supplierLink());

        ArgumentCaptor<ItemPriceBenchmark> captor = ArgumentCaptor.forClass(ItemPriceBenchmark.class);
        verify(benchmarkRepo).save(captor.capture());
        assertEquals("Bàn ghế gấp", captor.getValue().getItemName());
        assertEquals("Bộ", captor.getValue().getUnit());
        assertEquals("Cửa hàng nội thất A", captor.getValue().getSupplierName());
    }

    @Test
    void createBudgetItemWithoutBenchmark_linksExistingBenchmarkTrimmedIgnoreCase() {
        UUID catId = UUID.randomUUID();
        UUID existingBmId = UUID.randomUUID();
        ItemPriceBenchmark existingBm = new ItemPriceBenchmark();
        existingBm.setId(existingBmId);
        existingBm.setItemName("Nước suối 500ml");
        existingBm.setUnit("Chai");
        existingBm.setCurMarketPrice(new java.math.BigDecimal("5000"));
        existingBm.setSupplierName("Đại lý nước giải khát");
        existingBm.setLastUpdatedAt(OffsetDateTime.now());

        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(categoryRepo.findById(catId)).thenReturn(Optional.of(category(catId, "Hậu cần", false)));
        when(benchmarkRepo.findByItemNameAndUnitTrimmedIgnoreCase(
                argThat(s -> s != null && s.equalsIgnoreCase("Nước suối 500ml")),
                argThat(s -> s != null && s.equalsIgnoreCase("chai"))
        )).thenReturn(List.of(existingBm));

        when(budgetItemRepo.save(any(BudgetItem.class))).thenAnswer(inv -> {
            BudgetItem bi = inv.getArgument(0);
            bi.setId(UUID.randomUUID());
            return bi;
        });

        var req = new CreateBudgetItemRequest(catId, null, null, "  Nước suối 500ml  ",
                new java.math.BigDecimal("20"), "  chai  ", new java.math.BigDecimal("5000"), null, "Tiệm tạp hóa X", null);

        BudgetItemResponse response = service.createBudgetItem(eventId, req);

        assertNotNull(response);
        assertEquals(existingBmId, response.benchmarkId());
        verify(benchmarkRepo, never()).save(any(ItemPriceBenchmark.class));
    }

    @Test
    void getBudgetItemById_includesBenchmarkInfo() {
        UUID itemId = UUID.randomUUID();
        UUID bmId = UUID.randomUUID();

        BudgetItem item = new BudgetItem();
        item.setId(itemId);
        item.setEventId(eventId);
        item.setCategoryId(UUID.randomUUID());
        item.setItemName("Áo thun đồng phục");
        item.setQuantity(new java.math.BigDecimal("50"));
        item.setUnit("Cái");
        item.setEstUnitPrice(new java.math.BigDecimal("90000"));
        item.setBenchmarkId(bmId);

        ItemPriceBenchmark bm = new ItemPriceBenchmark();
        bm.setId(bmId);
        bm.setItemName("Áo thun đồng phục");
        bm.setUnit("Cái");
        bm.setSupplierName("Xưởng may F");
        bm.setSupplierLink("https://xuongmay.com");
        bm.setLastUpdatedAt(OffsetDateTime.now());

        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event(eventId, seriesId)));
        when(budgetItemRepo.findByIdAndEventId(itemId, eventId)).thenReturn(Optional.of(item));
        when(benchmarkRepo.findById(bmId)).thenReturn(Optional.of(bm));

        BudgetItemResponse res = service.getBudgetItemById(eventId, itemId);

        assertNotNull(res.benchmark());
        assertEquals("Xưởng may F", res.benchmark().supplierName());
        assertEquals("https://xuongmay.com", res.benchmark().supplierLink());
        assertNotNull(res.benchmark().lastUpdatedAt());
    }

    @Test
    void updateBenchmark_updatesLastUpdatedAt() {
        UUID bmId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();
        OffsetDateTime oldTime = OffsetDateTime.now().minusDays(5);

        ItemPriceBenchmark bm = new ItemPriceBenchmark();
        bm.setId(bmId);
        bm.setCategoryId(catId);
        bm.setItemName("Bút dạ");
        bm.setUnit("Cây");
        bm.setCurMarketPrice(new java.math.BigDecimal("5000"));
        bm.setSupplierName("Nhà sách Cũ");
        bm.setLastUpdatedAt(oldTime);

        when(benchmarkRepo.findById(bmId)).thenReturn(Optional.of(bm));
        when(categoryRepo.existsById(catId)).thenReturn(true);
        when(benchmarkRepo.existsByItemNameIgnoreCaseAndUnitIgnoreCaseAndIdNot("Bút dạ", "Cây", bmId)).thenReturn(false);
        when(benchmarkRepo.save(any(ItemPriceBenchmark.class))).thenAnswer(inv -> inv.getArgument(0));

        BenchmarkServiceImpl bmService = new BenchmarkServiceImpl(benchmarkRepo, categoryRepo, new FinanceMapper());
        var updateReq = new UpdateBenchmarkRequest(catId, "Bút dạ", "Cây", new java.math.BigDecimal("6000"),
                "Nhà sách Mới", "https://nhasach.com");

        BenchmarkResponse res = bmService.updateBenchmark(bmId, updateReq);

        assertNotNull(res);
        assertEquals("Nhà sách Mới", res.supplierName());
        assertTrue(res.lastUpdatedAt().isAfter(oldTime));
    }
}