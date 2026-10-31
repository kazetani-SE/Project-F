package com.projectf.features.knowledge.controller;

import com.projectf.common.response.ApiResponse;
import com.projectf.features.knowledge.dto.request.CreateFaqRequest;
import com.projectf.features.knowledge.dto.request.UpdateFaqPinRequest;
import com.projectf.features.knowledge.dto.response.FaqResponse;
import com.projectf.features.knowledge.service.FaqService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class FaqController {

    private final FaqService faqService;

    public FaqController(FaqService faqService) {
        this.faqService = faqService;
    }

    @GetMapping("/event-series/{seriesId}/faqs")
    public ResponseEntity<ApiResponse<List<FaqResponse>>> getFaqs(
            @PathVariable("seriesId") UUID seriesId,
            @RequestParam(value = "category", required = false) String category
    ) {
        List<FaqResponse> response = faqService.getFaqsBySeries(seriesId, category);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/event-series/{seriesId}/faqs")
    public ResponseEntity<ApiResponse<FaqResponse>> createFaq(
            @PathVariable("seriesId") UUID seriesId,
            @Valid @RequestBody CreateFaqRequest request
    ) {
        FaqResponse response = faqService.createFaq(seriesId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/faqs/{faqId}")
    public ResponseEntity<ApiResponse<FaqResponse>> getFaqById(
            @PathVariable("faqId") UUID faqId
    ) {
        FaqResponse response = faqService.getFaqById(faqId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping({"/event-series/{seriesId}/faqs/{faqId}/pin", "/faqs/{faqId}/pin"})
    public ResponseEntity<ApiResponse<FaqResponse>> updatePin(
            @PathVariable(value = "seriesId", required = false) UUID seriesId,
            @PathVariable("faqId") UUID faqId,
            @Valid @RequestBody UpdateFaqPinRequest request
    ) {
        FaqResponse response = faqService.updatePinStatus(faqId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
