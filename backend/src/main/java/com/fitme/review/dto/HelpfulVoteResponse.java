package com.fitme.review.dto;

import java.util.UUID;

public record HelpfulVoteResponse(UUID reviewId, int helpfulCount, boolean helpfulByMe) {
}
