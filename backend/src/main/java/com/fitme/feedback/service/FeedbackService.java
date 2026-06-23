package com.fitme.feedback.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.feedback.dto.FeedbackRequest;
import com.fitme.feedback.entity.Feedback;
import com.fitme.feedback.repository.FeedbackRepository;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final RecommendationRepository recommendationRepository;
    private final TryOnRequestRepository tryOnRequestRepository;
    private final AnalyticsService analyticsService;

    @Transactional
    public void submitForRecommendation(UUID recommendationId, FeedbackRequest request) {
        Recommendation rec = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
        save(rec.getUserId(), rec.getSessionId(), recommendationId, null, request);
    }

    @Transactional
    public void submitForTryOn(UUID tryOnRequestId, FeedbackRequest request) {
        TryOnRequest tryOn = tryOnRequestRepository.findById(tryOnRequestId)
                .orElseThrow(() -> new NotFoundException("Try-on không tồn tại"));
        save(tryOn.getUserId(), tryOn.getSessionId(), null, tryOnRequestId, request);
    }

    private void save(UUID userId, UUID sessionId, UUID recommendationId, UUID tryOnRequestId, FeedbackRequest request) {
        UUID uid = RequestContext.getCurrentUserId().orElse(userId);
        UUID sid = RequestContext.getSessionId().orElse(sessionId);
        feedbackRepository.save(Feedback.builder()
                .userId(uid)
                .sessionId(sid)
                .recommendationId(recommendationId)
                .tryOnRequestId(tryOnRequestId)
                .rating(request.getRating())
                .comment(request.getComment())
                .build());
        analyticsService.track("FEEDBACK_SUBMITTED", uid, sid, null, null, recommendationId, tryOnRequestId, null);
    }
}
