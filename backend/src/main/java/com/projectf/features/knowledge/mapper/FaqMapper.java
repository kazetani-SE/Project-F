package com.projectf.features.knowledge.mapper;

import com.projectf.features.knowledge.dto.request.CreateFaqRequest;
import com.projectf.features.knowledge.dto.response.FaqResponse;
import com.projectf.features.knowledge.entity.EventFaq;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class FaqMapper {

    public EventFaq toEntity(UUID seriesId, CreateFaqRequest request) {
        EventFaq faq = new EventFaq();
        faq.setSeriesId(seriesId);
        faq.setQuestion(request.question());
        faq.setAnswer(request.answer());
        faq.setCategory(request.category());
        faq.setIsPinned(Boolean.TRUE.equals(request.isPinned()));
        return faq;
    }

    public FaqResponse toResponse(EventFaq entity) {
        return new FaqResponse(
                entity.getId(),
                entity.getSeriesId(),
                entity.getQuestion(),
                entity.getAnswer(),
                entity.getCategory(),
                entity.getIsPinned(),
                entity.getUpdatedAt()
        );
    }
}
