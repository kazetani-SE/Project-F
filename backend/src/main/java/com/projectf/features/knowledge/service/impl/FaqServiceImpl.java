package com.projectf.features.knowledge.service.impl;

import com.projectf.features.knowledge.dto.request.CreateFaqRequest;
import com.projectf.features.knowledge.dto.request.UpdateFaqPinRequest;
import com.projectf.features.knowledge.dto.response.FaqResponse;
import com.projectf.features.knowledge.entity.EventFaq;
import com.projectf.features.knowledge.mapper.FaqMapper;
import com.projectf.features.knowledge.repository.FaqRepository;
import com.projectf.features.knowledge.service.FaqService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FaqServiceImpl implements FaqService {

    private final FaqRepository faqRepository;
    private final FaqMapper faqMapper;

    public FaqServiceImpl(FaqRepository faqRepository, FaqMapper faqMapper) {
        this.faqRepository = faqRepository;
        this.faqMapper = faqMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FaqResponse> getFaqsBySeries(UUID seriesId, String category) {
        List<EventFaq> faqs;
        if (category != null && !category.isBlank()) {
            faqs = faqRepository.findBySeriesIdAndCategoryOrderByIsPinnedDescUpdatedAtDesc(seriesId, category);
        } else {
            faqs = faqRepository.findBySeriesIdOrderByIsPinnedDescUpdatedAtDesc(seriesId);
        }
        return faqs.stream().map(faqMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FaqResponse getFaqById(UUID faqId) {
        EventFaq faq = faqRepository.findById(faqId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy FAQ với ID: " + faqId));
        return faqMapper.toResponse(faq);
    }

    @Override
    @Transactional
    public FaqResponse createFaq(UUID seriesId, CreateFaqRequest request) {
        EventFaq entity = faqMapper.toEntity(seriesId, request);
        EventFaq saved = faqRepository.save(entity);
        return faqMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public FaqResponse updatePinStatus(UUID faqId, UpdateFaqPinRequest request) {
        EventFaq faq = faqRepository.findById(faqId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy FAQ với ID: " + faqId));

        faq.setIsPinned(request.isPinned());
        EventFaq updated = faqRepository.save(faq);
        return faqMapper.toResponse(updated);
    }
}
