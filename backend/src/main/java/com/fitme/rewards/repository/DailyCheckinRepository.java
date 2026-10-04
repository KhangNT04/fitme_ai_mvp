package com.fitme.rewards.repository;

import com.fitme.rewards.entity.DailyCheckin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyCheckinRepository extends JpaRepository<DailyCheckin, UUID> {

    Optional<DailyCheckin> findByUserIdAndCheckinDate(UUID userId, LocalDate checkinDate);

    List<DailyCheckin> findByUserIdAndCheckinDateGreaterThanEqualOrderByCheckinDateAsc(UUID userId, LocalDate from);
}
