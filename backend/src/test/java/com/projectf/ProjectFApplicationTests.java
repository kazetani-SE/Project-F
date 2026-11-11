package com.projectf;

import com.projectf.features.document.repository.DocumentRepository;
import com.projectf.features.event.repository.EventOrganizerRepository;
import com.projectf.features.event.repository.EventRepository;
import com.projectf.features.event.repository.EventSeriesRepository;
import com.projectf.features.knowledge.repository.FaqRepository;
import com.projectf.features.knowledge.repository.FeedbackRepository;
import com.projectf.features.knowledge.repository.IncidentRepository;
import com.projectf.features.media.repository.MediaAssetRepository;
import com.projectf.features.member.repository.ClubMemberRepository;
import com.projectf.features.member.service.MemberCredentialService;
import com.projectf.features.finance.repository.BudgetCategoryRepository;
import com.projectf.features.finance.repository.BudgetItemRepository;
import com.projectf.features.finance.repository.EventBudgetSummaryViewRepository;
import com.projectf.features.finance.repository.ExpenseReceiptRepository;
import com.projectf.features.finance.repository.ExpenseRepository;
import com.projectf.features.finance.repository.ItemPriceBenchmarkRepository;
import com.projectf.features.finance.repository.ProjectedBudgetViewRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
class ProjectFApplicationTests {

    @MockBean
    private DocumentRepository documentRepository;

    @MockBean
    private MediaAssetRepository mediaAssetRepository;

    @MockBean
    private IncidentRepository incidentRepository;

    @MockBean
    private FaqRepository faqRepository;

    @MockBean
    private FeedbackRepository feedbackRepository;

    @MockBean
    private EventRepository eventRepository;

    @MockBean
    private EventSeriesRepository eventSeriesRepository;

    @MockBean
    private EventOrganizerRepository eventOrganizerRepository;

    @MockBean
    private ClubMemberRepository clubMemberRepository;

    @MockBean
    private MemberCredentialService memberCredentialService;

    @MockBean
    private BudgetCategoryRepository budgetCategoryRepository;

    @MockBean
    private ItemPriceBenchmarkRepository itemPriceBenchmarkRepository;

    @MockBean
    private BudgetItemRepository budgetItemRepository;

    @MockBean
    private ExpenseRepository expenseRepository;

    @MockBean
    private ExpenseReceiptRepository expenseReceiptRepository;

    @MockBean
    private EventBudgetSummaryViewRepository eventBudgetSummaryViewRepository;

    @MockBean
    private ProjectedBudgetViewRepository projectedBudgetViewRepository;

    @Test
    void contextLoads() {
    }

}
