package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ItemPriceBenchmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemPriceBenchmarkRepository extends JpaRepository<ItemPriceBenchmark, UUID> {
    List<ItemPriceBenchmark> findByCategoryId(UUID categoryId);
    List<ItemPriceBenchmark> findByItemNameContainingIgnoreCase(String keyword);
    boolean existsByItemNameIgnoreCaseAndUnitIgnoreCase(String itemName, String unit);
    boolean existsByItemNameIgnoreCaseAndUnitIgnoreCaseAndIdNot(String itemName, String unit, UUID id);
    Optional<ItemPriceBenchmark> findByItemNameIgnoreCaseAndUnitIgnoreCase(String itemName, String unit);
}

