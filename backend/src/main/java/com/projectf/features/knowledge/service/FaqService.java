package com.projectf.features.knowledge.service;

import com.projectf.features.knowledge.dto.request.CreateFaqRequest;
import com.projectf.features.knowledge.dto.request.UpdateFaqPinRequest;
import com.projectf.features.knowledge.dto.response.FaqResponse;
import java.util.List;
import java.util.UUID;

public interface FaqService {
    List<FaqResponse> getFaqsBySeries(UUID seriesId, String category);

    FaqResponse getFaqById(UUID faqId);

    FaqResponse createFaq(UUID seriesId, CreateFaqRequest request);

    FaqResponse updatePinStatus(UUID faqId, UpdateFaqPinRequest request);

    void deleteFaq(UUID faqId);
}
