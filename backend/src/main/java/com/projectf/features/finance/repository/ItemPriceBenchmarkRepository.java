package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ItemPriceBenchmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ItemPriceBenchmarkRepository extends JpaRepository<ItemPriceBenchmark, UUID> {
    List<ItemPriceBenchmark> findByCategoryId(UUID categoryId);
    List<ItemPriceBenchmark> findByItemNameContainingIgnoreCase(String keyword);
    boolean existsByItemNameIgnoreCaseAndUnitIgnoreCase(String itemName, String unit);
    boolean existsByItemNameIgnoreCaseAndUnitIgnoreCaseAndIdNot(String itemName, String unit, UUID id);
    boolean existsByCategoryId(UUID categoryId);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM ItemPriceBenchmark b WHERE LOWER(TRIM(b.itemName)) = LOWER(TRIM(:itemName)) AND LOWER(TRIM(b.unit)) = LOWER(TRIM(:unit))")
    List<ItemPriceBenchmark> findByItemNameAndUnitTrimmedIgnoreCase(
            @org.springframework.data.repository.query.Param("itemName") String itemName,
            @org.springframework.data.repository.query.Param("unit") String unit);
}