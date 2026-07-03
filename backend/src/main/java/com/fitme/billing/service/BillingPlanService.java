package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.dto.BillingPlanRequest;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingPlanService {

    private final BillingPlanRepository planRepository;
    private final BillingDtoMapper dtoMapper;

    public List<BillingPlanDto> listAll() {
        return planRepository.findAllByOrderBySortOrderAsc().stream().map(dtoMapper::toDto).toList();
    }

    public List<BillingPlanDto> listActive() {
        return planRepository.findByActiveTrueOrderBySortOrderAsc().stream().map(dtoMapper::toDto).toList();
    }

    public BillingPlan getEntity(UUID id) {
        return planRepository.findById(id).orElseThrow(() -> new NotFoundException("Gói không tồn tại"));
    }

    @Transactional
    public BillingPlanDto create(BillingPlanRequest request) {
        validateRequest(request);
        if (planRepository.findByCode(request.getCode()).isPresent()) {
            throw new BusinessException("Mã gói đã tồn tại");
        }
        BillingPlan plan = BillingPlan.builder()
                .code(request.getCode())
                .name(request.getName())
                .planType(request.getPlanType())
                .priceVnd(request.getPriceVnd())
                .quotaAmount(request.getQuotaAmount())
                .includesDashboard(request.isIncludesDashboard())
                .billingPeriodDays(request.getBillingPeriodDays())
                .active(request.isActive())
                .sortOrder(request.getSortOrder())
                .build();
        return dtoMapper.toDto(planRepository.save(plan));
    }

    @Transactional
    public BillingPlanDto update(UUID id, BillingPlanRequest request) {
        validateRequest(request);
        BillingPlan plan = getEntity(id);
        planRepository.findByCode(request.getCode())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new BusinessException("Mã gói đã tồn tại");
                });
        plan.setCode(request.getCode());
        plan.setName(request.getName());
        plan.setPlanType(request.getPlanType());
        plan.setPriceVnd(request.getPriceVnd());
        plan.setQuotaAmount(request.getQuotaAmount());
        plan.setIncludesDashboard(request.isIncludesDashboard());
        plan.setBillingPeriodDays(request.getBillingPeriodDays());
        plan.setActive(request.isActive());
        plan.setSortOrder(request.getSortOrder());
        return dtoMapper.toDto(planRepository.save(plan));
    }

    @Transactional
    public void delete(UUID id) {
        if (!planRepository.existsById(id)) {
            throw new NotFoundException("Gói không tồn tại");
        }
        planRepository.deleteById(id);
    }

    private void validateRequest(BillingPlanRequest request) {
        if (request.getPlanType() == BillingPlanType.SUBSCRIPTION) {
            if (!request.isIncludesDashboard()) {
                throw new BusinessException("Gói tháng phải bao gồm dashboard");
            }
            if (request.getBillingPeriodDays() == null || request.getBillingPeriodDays() <= 0) {
                throw new BusinessException("Gói tháng cần billingPeriodDays > 0");
            }
        } else if (request.isIncludesDashboard()) {
            throw new BusinessException("Gói top-up không được bao gồm dashboard");
        }
    }
}
