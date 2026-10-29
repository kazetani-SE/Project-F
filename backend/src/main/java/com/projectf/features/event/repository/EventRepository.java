package com.projectf.features.event.repository;
import com.projectf.features.event.entity.Event;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EventRepository extends JpaRepository<Event,UUID> {}
