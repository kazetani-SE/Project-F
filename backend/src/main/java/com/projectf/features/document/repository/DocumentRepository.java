package com.projectf.features.document.repository;

import com.projectf.features.document.entity.EventDocument;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<EventDocument, UUID> {
    List<EventDocument> findByEventIdOrderByCreatedAtDesc(UUID eventId);

    List<EventDocument> findByParentDocumentId(UUID parentDocumentId);
}
