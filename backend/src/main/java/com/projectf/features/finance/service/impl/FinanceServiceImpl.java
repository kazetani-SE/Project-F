package com.projectf.features.finance.service.impl;

import com.projectf.common.DomainRules;
import com.projectf.common.StorageReference;
import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.response.PageResponse;
import com.projectf.common.security.AccessService;
import com.projectf.features.event.entity.Event;
import com.projectf.features.event.service.EventService;
import com.projectf.features.finance.dto.request.*;
import com.projectf.features.finance.dto.response.*;
import com.projectf.features.finance.entity.*;
import com.projectf.features.finance.mapper.FinanceMapper;
import com.projectf.features.finance.repository.*;
import com.projectf.features.finance.service.FinanceService;
import com.projectf.features.knowledge.service.KnowledgeService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FinanceServiceImpl implements FinanceService {
    private final BudgetCategoryRepository categoryRepository;
    private final ItemPriceBenchmarkRepository benchmarkRepository;
    private final BudgetItemRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseReceiptRepository receiptRepository;
    private final BudgetSummaryRepository summaryRepository;
    private final ProjectedBudgetRepository projectedRepository;
    private final KnowledgeService knowledgeService;
    private final EventService eventService;
    private final AccessService access;
    private final FinanceMapper mapper;
    private final StorageReference storage;
    private final EntityManager entityManager;

    public FinanceServiceImpl(final BudgetCategoryRepository categoryRepository,
            final ItemPriceBenchmarkRepository benchmarkRepository, final BudgetItemRepository budgetRepository,
            final ExpenseRepository expenseRepository, final ExpenseReceiptRepository receiptRepository,
            final BudgetSummaryRepository summaryRepository, final ProjectedBudgetRepository projectedRepository,
            final KnowledgeService knowledgeService,
            final EventService eventService, final AccessService access, final FinanceMapper mapper,
            final StorageReference storage, final EntityManager entityManager) {
        this.categoryRepository = categoryRepository;
        this.benchmarkRepository = benchmarkRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.receiptRepository = receiptRepository;
        this.summaryRepository = summaryRepository;
        this.projectedRepository = projectedRepository;
        this.knowledgeService = knowledgeService;
        this.eventService = eventService;
        this.access = access;
        this.mapper = mapper;
        this.storage = storage;
        this.entityManager = entityManager;
    }

    @Override public PageResponse<CategoryResponse> categories(final int page, final int size) {
        final Page<BudgetCategory> data = categoryRepository.findAll(
                PageRequest.of(page, size, Sort.by("name").ascending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }

    @Override @Transactional public CategoryResponse category(final CategoryRequest request) {
        access.requireClubAdmin();
        return mapper.toResponse(categoryRepository.save(mapper.create(request)));
    }

    @Override public PageResponse<BenchmarkResponse> benchmarks(final UUID categoryId, final String keyword,
            final int page, final int size) {
        Specification<ItemPriceBenchmark> filter = (root, query, cb) -> cb.conjunction();
        if (categoryId != null) filter = filter.and((root, query, cb) ->
                cb.equal(root.get("category").get("id"), categoryId));
        if (keyword != null && !keyword.isBlank()) {
            final String term = "%" + keyword.toLowerCase(Locale.ROOT).trim() + "%";
            filter = filter.and((root, query, cb) -> cb.like(cb.lower(root.get("itemName")), term));
        }
        final Page<ItemPriceBenchmark> data = benchmarkRepository.findAll(filter,
                PageRequest.of(page, size, Sort.by("itemName").ascending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }

    @Override @Transactional public BenchmarkResponse benchmark(final BenchmarkRequest request) {
        access.requireClubAdmin();
        final var item = mapper.create(request, requireCategory(request.categoryId()));
        benchmarkRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }

    @Override @Transactional public BenchmarkResponse updateBenchmark(final UUID id,
            final BenchmarkUpdateRequest request) {
        access.requireClubAdmin();
        final var item = benchmarkRepository.findById(id).orElseThrow(NoSuchElementException::new);
        if (request.itemName() != null) item.setItemName(request.itemName());
        if (request.unit() != null) item.setUnit(request.unit());
        if (request.currentMarketPrice() != null) item.setCurrentMarketPrice(request.currentMarketPrice());
        if (request.supplierReference() != null) item.setSupplierReference(request.supplierReference());
        return mapper.toResponse(benchmarkRepository.save(item));
    }

    @Override public PageResponse<BudgetItemResponse> budgets(final UUID eventId, final int page, final int size) {
        eventService.requireEvent(eventId);
        final Page<BudgetItem> data = budgetRepository.findByEventId(eventId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return PageResponse.of(data.map(mapper::toResponse).getContent(), page, size, data.getTotalElements());
    }

    @Override @Transactional public BudgetItemResponse createBudget(final UUID eventId,
            final BudgetItemRequest request) {
        access.requireOrganizer(eventId);
        final Event event = eventService.requireEvent(eventId);
        final BudgetCategory category = requireCategory(request.categoryId());
        final ItemPriceBenchmark benchmark = request.benchmarkId() == null ? null
                : benchmarkRepository.findById(request.benchmarkId()).orElseThrow(NoSuchElementException::new);
        if (benchmark != null && !category.getId().equals(benchmark.getCategory().getId())) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        final var media = request.mediaAsset() == null ? null : knowledgeService.requireMedia(request.mediaAsset());
        if (media != null && !eventId.equals(media.getEvent().getId())) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        final BudgetItem item = mapper.create(request, event, category, benchmark, media);
        item.setApprovalStatus(ApprovalStatus.PENDING);
        budgetRepository.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }

    @Override @Transactional public BudgetItemResponse approveBudget(final UUID eventId, final UUID itemId,
            final ApprovalRequest request) {
        access.requireFinanceLead(eventId);
        final Event lockedEvent = eventService.lockEvent(eventId);
        final BudgetItem item = budgetRepository.findByIdAndEventId(itemId, eventId)
                .orElseThrow(NoSuchElementException::new);
        validateDecision(request);
        if (request.status() == ApprovalStatus.APPROVED) {
            final BigDecimal allocated = lockedEvent.getAllocatedFund();
            final BigDecimal approved = budgetRepository.sumApprovedExcept(eventId, itemId);
            if (allocated == null || approved.add(item.getTotalEstimatedAmount()).compareTo(allocated) > 0) {
                throw new IllegalArgumentException("BUDGET_OVER_ALLOCATED");
            }
        }
        item.setApprovalStatus(request.status());
        item.setApprovedBy(access.member());
        item.setApprovedAt(Instant.now());
        item.setRejectionReason(request.status() == ApprovalStatus.REJECTED ? request.rejectionReason() : null);
        return mapper.toResponse(budgetRepository.save(item));
    }

    @Override public PageResponse<ExpenseResponse> expenses(final UUID eventId, final int page, final int size) {
        eventService.requireEvent(eventId);
        final Page<Expense> data = expenseRepository.findByEventId(eventId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        final List<ExpenseResponse> items = data.getContent().stream().map(this::expenseResponse).toList();
        return PageResponse.of(items, page, size, data.getTotalElements());
    }

    @Override @Transactional public ExpenseResponse createExpense(final UUID eventId, final ExpenseRequest request) {
        final Event event = eventService.requireEvent(eventId);
        final BudgetItem budget = request.budgetItemId() == null ? null
                : budgetRepository.findByIdAndEventId(request.budgetItemId(), eventId)
                        .orElseThrow(NoSuchElementException::new);
        final Expense item = mapper.create(request, event, budget, access.member());
        item.setStatus(ApprovalStatus.PENDING);
        expenseRepository.saveAndFlush(item);
        entityManager.refresh(item);
        final List<ReceiptResponse> saved = new ArrayList<>();
        if (request.receipts() != null) {
            for (ReceiptRequest receipt : request.receipts()) saved.add(saveReceipt(item, receipt));
        }
        return mapper.toResponse(item, saved);
    }

    @Override @Transactional public ReceiptResponse addReceipt(final UUID eventId, final UUID expenseId,
            final ReceiptRequest request) {
        final Expense expense = expenseRepository.findByIdAndEventId(expenseId, eventId)
                .orElseThrow(NoSuchElementException::new);
        if (!access.memberId().equals(expense.getPaidBy().getId())) access.requireFinanceLead(eventId);
        return saveReceipt(expense, request);
    }

    @Override @Transactional public ExpenseResponse approveExpense(final UUID eventId, final UUID expenseId,
            final ApprovalRequest request) {
        access.requireFinanceLead(eventId);
        final Event lockedEvent = eventService.lockEvent(eventId);
        final Expense expense = expenseRepository.findByIdAndEventId(expenseId, eventId)
                .orElseThrow(NoSuchElementException::new);
        validateDecision(request);
        if (request.status() == ApprovalStatus.APPROVED) {
            DomainRules.approveExpense(Math.toIntExact(receiptRepository.countByExpenseId(expenseId)),
                    lockedEvent.getAllocatedFund(),
                    expenseRepository.sumApprovedExcept(eventId, expenseId), expense.getTotalAmount());
        }
        expense.setStatus(request.status());
        expense.setApprovedBy(access.member());
        expense.setApprovedAt(Instant.now());
        expense.setRejectionReason(request.status() == ApprovalStatus.REJECTED ? request.rejectionReason() : null);
        return expenseResponse(expenseRepository.save(expense));
    }

    @Override public BudgetSummaryResponse summary(final UUID eventId) {
        eventService.requireEvent(eventId);
        return mapper.toResponse(summaryRepository.findById(eventId).orElseThrow(NoSuchElementException::new));
    }

    @Override public List<ProjectedBudgetResponse> projected(final UUID eventId) {
        final UUID previousId = eventService.previousCompletedEvent(eventId);
        return previousId == null ? List.of() : projectedRepository
                .findByPreviousEventIdOrderByItemName(previousId).stream().map(mapper::toResponse).toList();
    }

    @Override @Transactional public List<BudgetItemResponse> applyProjected(final UUID eventId) {
        access.requireFinanceLead(eventId);
        if (budgetRepository.countByEventId(eventId) > 0) throw new IllegalArgumentException("DUPLICATE_RESOURCE");
        final Event event = eventService.requireEvent(eventId);
        final List<BudgetItemResponse> result = new ArrayList<>();
        for (ProjectedBudgetResponse suggestion : projected(eventId)) {
            final BudgetItem item = new BudgetItem();
            item.setEvent(event);
            item.setCategory(requireCategory(suggestion.categoryId()));
            if (suggestion.benchmarkId() != null) item.setBenchmark(benchmarkRepository
                    .findById(suggestion.benchmarkId()).orElseThrow(NoSuchElementException::new));
            item.setItemName(suggestion.itemName());
            item.setUnit(suggestion.unit());
            item.setQuantity(suggestion.baseQuantityForProjection());
            item.setEstimatedUnitPrice(suggestion.currentAdjustedUnitPrice());
            item.setApprovalStatus(ApprovalStatus.PENDING);
            budgetRepository.saveAndFlush(item);
            entityManager.refresh(item);
            result.add(mapper.toResponse(item));
        }
        return result;
    }

    private BudgetCategory requireCategory(final UUID id) {
        return categoryRepository.findById(id).orElseThrow(NoSuchElementException::new);
    }
    private ReceiptResponse saveReceipt(final Expense expense, final ReceiptRequest request) {
        storage.require("RECEIPT", request.imageUrl());
        final ExpenseReceipt receipt = mapper.create(request, expense);
        receiptRepository.saveAndFlush(receipt);
        entityManager.refresh(receipt);
        return mapper.toResponse(receipt);
    }
    private ExpenseResponse expenseResponse(final Expense expense) {
        return mapper.toResponse(expense, receiptRepository.findByExpenseIdOrderByCreatedAtDesc(expense.getId())
                .stream().map(mapper::toResponse).toList());
    }
    private void validateDecision(final ApprovalRequest request) {
        if (request.status() != ApprovalStatus.APPROVED && request.status() != ApprovalStatus.REJECTED) {
            throw new IllegalArgumentException("VALIDATION_FAILED");
        }
        if (request.status() == ApprovalStatus.REJECTED && (request.rejectionReason() == null
                || request.rejectionReason().isBlank())) throw new IllegalArgumentException("VALIDATION_FAILED");
    }
}
