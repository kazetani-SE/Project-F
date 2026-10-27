package com.projectf.features.event.repository;
import com.projectf.features.event.entity.EventOrganizer;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EventOrganizerRepository extends JpaRepository<EventOrganizer,UUID> {}
