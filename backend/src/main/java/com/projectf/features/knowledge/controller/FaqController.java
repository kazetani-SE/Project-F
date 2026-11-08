package com.projectf.features.knowledge.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.common.security.AccessPolicy;
import com.projectf.features.knowledge.dto.request.CreateFaqRequest;
import com.projectf.features.knowledge.dto.request.UpdateFaqPinRequest;
import com.projectf.features.knowledge.dto.response.FaqResponse;
import com.projectf.features.knowledge.service.FaqService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Knowledge - FAQs", description = "Quản lý câu hỏi thường gặp cho chuỗi sự kiện")
@RestController
@RequestMapping("/v1")
public class FaqController {

    private static final String SERIES_ID = "seriesId";
    private static final String FAQ_ID = "faqId";

    private final FaqService faqService;
    private final AccessPolicy access;

    public FaqController(FaqService faqService, AccessPolicy access) {
        this.faqService = faqService;
        this.access = access;
    }

    @GetMapping("/event-series/{seriesId}/faqs")
    public ResponseEntity<ApiResponse<List<FaqResponse>>> getFaqs(
            @PathVariable(SERIES_ID) UUID seriesId,
            @RequestParam(value = "category", required = false) String category
    ) {
        access.requireSeries(seriesId);
        List<FaqResponse> response = faqService.getFaqsBySeries(seriesId, category);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/event-series/{seriesId}/faqs")
    public ResponseEntity<ApiResponse<FaqResponse>> createFaq(
            @PathVariable(SERIES_ID) UUID seriesId,
            @Valid @RequestBody CreateFaqRequest request
    ) {
        FaqResponse response = faqService.createFaq(seriesId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/faqs/{faqId}")
    public ResponseEntity<ApiResponse<FaqResponse>> getFaqById(
            @PathVariable(FAQ_ID) UUID faqId
    ) {
        FaqResponse response = faqService.getFaqById(faqId);
        access.requireSeries(response.seriesId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping({"/event-series/{seriesId}/faqs/{faqId}/pin", "/faqs/{faqId}/pin"})
    public ResponseEntity<ApiResponse<FaqResponse>> updatePin(
            @PathVariable(value = SERIES_ID, required = false) UUID seriesId,
            @PathVariable(FAQ_ID) UUID faqId,
            @Valid @RequestBody UpdateFaqPinRequest request
    ) {
        FaqResponse response = faqService.updatePinStatus(faqId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping({"/event-series/{seriesId}/faqs/{faqId}", "/faqs/{faqId}"})
    public ResponseEntity<ApiResponse<Void>> deleteFaq(
            @PathVariable(value = SERIES_ID, required = false) UUID seriesId,
            @PathVariable(FAQ_ID) UUID faqId
    ) {
        faqService.deleteFaq(faqId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
