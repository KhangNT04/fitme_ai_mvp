package com.fitme.fitken.repository;

import com.fitme.common.enums.FitkenEntryType;
import com.fitme.fitken.entity.FitkenLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FitkenLedgerRepository extends JpaRepository<FitkenLedgerEntry, UUID> {

    boolean existsByEntryTypeAndReferenceTypeAndReferenceId(
            FitkenEntryType entryType, String referenceType, UUID referenceId);

    Optional<FitkenLedgerEntry> findFirstByEntryTypeAndReferenceTypeAndReferenceId(
            FitkenEntryType entryType, String referenceType, UUID referenceId);

    Page<FitkenLedgerEntry> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<FitkenLedgerEntry> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndEntryType(UUID userId, FitkenEntryType entryType);
}
