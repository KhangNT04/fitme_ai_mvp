package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.dto.BillingPlanRequest;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.repository.ConsumerBillingOrderRepository;
import com.fitme.billing.repository.ConsumerSubscriptionRepository;
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
    private final ConsumerBillingOrderRepository orderRepository;
    private final ConsumerSubscriptionRepository subscriptionRepository;
    private final BillingDtoMapper dtoMapper;

    public List<BillingPlanDto> listAll() {
        return planRepository.findAllByOrderBySortOrderAsc().stream().map(dtoMapper::toDto).toList();
    }

    public BillingPlanDto get(UUID id) {
        return dtoMapper.toDto(getEntity(id));
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
        BillingPlan plan = BillingPlan.builder().build();
        apply(plan, request);
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
        apply(plan, request);
        return dtoMapper.toDto(planRepository.save(plan));
    }

    @Transactional
    public void delete(UUID id) {
        if (!planRepository.existsById(id)) {
            throw new NotFoundException("Gói không tồn tại");
        }
        if (orderRepository.existsByPlanId(id) || subscriptionRepository.existsByPlanId(id)) {
            throw new BusinessException("Gói đã có người mua — hãy tắt gói (active=false) thay vì xóa");
        }
        planRepository.deleteById(id);
    }

    private void apply(BillingPlan plan, BillingPlanRequest request) {
        plan.setCode(request.getCode().trim());
        plan.setName(request.getName().trim());
        plan.setPlanType(planType(request));
        plan.setPriceVnd(request.getPriceVnd());
        plan.setQuotaAmount(request.getFitkenAmount());
        plan.setBillingPeriodDays(request.getBillingPeriodDays());
        plan.setActive(request.isActive());
        plan.setSortOrder(request.getSortOrder());
    }

    private void validateRequest(BillingPlanRequest request) {
        if (planType(request) == BillingPlanType.SUBSCRIPTION
                && (request.getBillingPeriodDays() == null || request.getBillingPeriodDays() <= 0)) {
            throw new BusinessException("Gói tháng cần billingPeriodDays > 0");
        }
    }

    private static BillingPlanType planType(BillingPlanRequest request) {
        return request.getPlanType() != null ? request.getPlanType() : BillingPlanType.SUBSCRIPTION;
    }
}
