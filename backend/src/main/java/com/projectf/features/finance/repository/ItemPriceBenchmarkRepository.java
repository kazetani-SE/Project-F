package com.projectf.features.finance.repository;

import com.projectf.features.finance.entity.ItemPriceBenchmark;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ItemPriceBenchmarkRepository extends JpaRepository<ItemPriceBenchmark, UUID>,
        JpaSpecificationExecutor<ItemPriceBenchmark> {
}

