package com.fitme.billing.repository;

import com.fitme.billing.entity.BrandQuotaLedger;
import com.fitme.common.enums.QuotaLedgerEntryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BrandQuotaLedgerRepository extends JpaRepository<BrandQuotaLedger, UUID> {

    boolean existsByBrandIdAndEntryTypeAndReferenceTypeAndReferenceId(
            UUID brandId, QuotaLedgerEntryType entryType, String referenceType, UUID referenceId);
}
