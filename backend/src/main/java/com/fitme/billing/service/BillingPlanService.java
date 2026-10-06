package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.dto.BillingPlanRequest;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.repository.ConsumerBillingOrderRepository;
import com.fitme.billing.repository.ConsumerSubscriptionRepository;
import com.fitme.brandplus.repository.BrandBillingOrderRepository;
import com.fitme.brandplus.repository.BrandSubscriptionRepository;
import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.enums.PlanAudience;
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
    private final BrandBillingOrderRepository brandOrderRepository;
    private final BrandSubscriptionRepository brandSubscriptionRepository;
    private final BillingDtoMapper dtoMapper;

    public List<BillingPlanDto> listAll(PlanAudience audience) {
        List<BillingPlan> plans = audience == null
                ? planRepository.findAllByOrderBySortOrderAsc()
                : planRepository.findByAudienceOrderBySortOrderAsc(audience);
        return plans.stream().map(dtoMapper::toDto).toList();
    }

    public BillingPlanDto get(UUID id) {
        return dtoMapper.toDto(getEntity(id));
    }

    /** Plans consumers can buy (public pricing page). */
    public List<BillingPlanDto> listActiveConsumerPlans() {
        return planRepository.findByAudienceAndActiveTrueOrderBySortOrderAsc(PlanAudience.CONSUMER).stream()
                .map(dtoMapper::toDto)
                .toList();
    }

    public BillingPlan getEntity(UUID id) {
        return planRepository.findById(id).orElseThrow(() -> new NotFoundException("Gói không tồn tại"));
    }

    @Transactional
    public BillingPlanDto create(BillingPlanRequest request) {
        PlanAudience audience = request.getAudience() != null ? request.getAudience() : PlanAudience.CONSUMER;
        validateRequest(request, audience);
        if (planRepository.findByCode(request.getCode().trim()).isPresent()) {
            throw new BusinessException("Mã gói đã tồn tại");
        }
        BillingPlan plan = BillingPlan.builder().audience(audience).build();
        apply(plan, request);
        return dtoMapper.toDto(planRepository.save(plan));
    }

    @Transactional
    public BillingPlanDto update(UUID id, BillingPlanRequest request) {
        BillingPlan plan = getEntity(id);
        if (request.getAudience() != null && request.getAudience() != plan.getAudience()) {
            throw new BusinessException("Không thể đổi đối tượng của gói (người dùng / brand)");
        }
        validateRequest(request, plan.getAudience());
        planRepository.findByCode(request.getCode().trim())
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
        if (orderRepository.existsByPlanId(id) || subscriptionRepository.existsByPlanId(id)
                || brandOrderRepository.existsByPlanId(id) || brandSubscriptionRepository.existsByPlanId(id)) {
            throw new BusinessException("Gói đã có người mua — hãy tắt gói (active=false) thay vì xóa");
        }
        planRepository.deleteById(id);
    }

    private void apply(BillingPlan plan, BillingPlanRequest request) {
        boolean brandPlan = plan.getAudience() == PlanAudience.BRAND;
        plan.setCode(request.getCode().trim());
        plan.setName(request.getName().trim());
        plan.setPlanType(planType(request));
        plan.setPriceVnd(request.getPriceVnd());
        plan.setQuotaAmount(brandPlan ? 0 : request.getFitkenAmount());
        plan.setBillingPeriodDays(request.getBillingPeriodDays());
        plan.setActive(request.isActive());
        plan.setSortOrder(request.getSortOrder());
        plan.setDiscountPercent(request.getDiscountPercent());
        plan.setDiscountStartsAt(request.getDiscountStartsAt());
        plan.setDiscountEndsAt(request.getDiscountEndsAt());
    }

    private void validateRequest(BillingPlanRequest request, PlanAudience audience) {
        if (planType(request) == BillingPlanType.SUBSCRIPTION
                && (request.getBillingPeriodDays() == null || request.getBillingPeriodDays() <= 0)) {
            throw new BusinessException("Gói tháng cần billingPeriodDays > 0");
        }
        Integer percent = request.getDiscountPercent();
        if (percent != null && (percent < 0 || percent > 100)) {
            throw new BusinessException("Phần trăm giảm giá phải từ 0 đến 100");
        }
        if (request.getDiscountStartsAt() != null && request.getDiscountEndsAt() != null
                && !request.getDiscountEndsAt().isAfter(request.getDiscountStartsAt())) {
            throw new BusinessException("Thời điểm kết thúc giảm giá phải sau thời điểm bắt đầu");
        }
        if (audience == PlanAudience.BRAND) {
            if (planType(request) != BillingPlanType.SUBSCRIPTION) {
                throw new BusinessException("Gói brand phải là gói theo chu kỳ (SUBSCRIPTION)");
            }
            return;
        }
        if (request.getFitkenAmount() < 1) {
            throw new BusinessException("Gói người dùng cần số Fitken >= 1");
        }
        boolean hasDiscount = (percent != null && percent > 0)
                || request.getDiscountStartsAt() != null || request.getDiscountEndsAt() != null;
        if (hasDiscount) {
            throw new BusinessException("Giảm giá hiện chỉ áp dụng cho gói brand");
        }
    }

    private static BillingPlanType planType(BillingPlanRequest request) {
        return request.getPlanType() != null ? request.getPlanType() : BillingPlanType.SUBSCRIPTION;
    }
}
