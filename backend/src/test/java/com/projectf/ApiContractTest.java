package com.projectf;

import com.projectf.common.enums.ApprovalStatus;
import com.projectf.common.exception.GlobalExceptionHandler;
import com.projectf.features.finance.controller.FinanceController;
import com.projectf.features.finance.dto.response.BudgetItemResponse;
import com.projectf.features.finance.service.FinanceService;
import com.projectf.features.knowledge.controller.KnowledgeController;
import com.projectf.features.knowledge.dto.response.FeedbackSummaryResponse;
import com.projectf.features.knowledge.service.KnowledgeService;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ApiContractTest {
    @Test
    void budgetCreationKeepsFrontendResponseShape() throws Exception {
        final FinanceService service = mock(FinanceService.class);
        final UUID eventId = UUID.randomUUID();
        final UUID categoryId = UUID.randomUUID();
        final UUID itemId = UUID.randomUUID();
        when(service.createBudget(any(), any())).thenReturn(new BudgetItemResponse(itemId, eventId,
                categoryId, null, "Venue", null, BigDecimal.ONE, "day", new BigDecimal("100"),
                new BigDecimal("100"), null, ApprovalStatus.PENDING, null, null, null, null));
        final MockMvc mvc = MockMvcBuilders.standaloneSetup(new FinanceController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/v1/events/{eventId}/budget-items", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"categoryId\":\"" + categoryId + "\",\"itemName\":\"Venue\","
                        + "\"quantity\":1,\"unit\":\"day\",\"estimatedUnitPrice\":100}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(itemId.toString()))
                .andExpect(jsonPath("$.data.approvalStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.totalEstimatedAmount").value(100));
    }

    @Test
    void malformedApprovalStatusReturnsValidationError() throws Exception {
        final MockMvc mvc = MockMvcBuilders.standaloneSetup(new FinanceController(mock(FinanceService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(patch("/v1/events/{eventId}/expenses/{expenseId}/approval",
                UUID.randomUUID(), UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNKNOWN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    void feedbackSummaryUsesFrontendFieldNames() throws Exception {
        final KnowledgeService service = mock(KnowledgeService.class);
        when(service.feedbackSummary(any())).thenReturn(new FeedbackSummaryResponse(2, new BigDecimal("4.5")));
        final MockMvc mvc = MockMvcBuilders.standaloneSetup(new KnowledgeController(service)).build();
        mvc.perform(get("/v1/events/{eventId}/feedback-summary", UUID.randomUUID()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.responseCount").value(2))
                .andExpect(jsonPath("$.data.averageRating").value(4.5));
    }
}
