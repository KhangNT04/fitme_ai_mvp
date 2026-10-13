package com.fitme.product.repository;

import com.fitme.product.entity.SizeChart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SizeChartRepository extends JpaRepository<SizeChart, UUID> {

    List<SizeChart> findByProductId(UUID productId);

    List<SizeChart> findByProductIdIn(Collection<UUID> productIds);
}
