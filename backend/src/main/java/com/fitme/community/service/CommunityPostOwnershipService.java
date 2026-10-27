package com.fitme.community.service;

import com.fitme.community.entity.CommunityPost;
import com.fitme.community.repository.CommunityPostRepository;
import com.fitme.rewards.service.CommunityPostOwnership;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Answers ownership questions about community posts for other modules.
 *
 * <p>The rewards module uses this to check that a user may only claim the share reward for a
 * community post they published themselves.
 */
@Service
@RequiredArgsConstructor
public class CommunityPostOwnershipService implements CommunityPostOwnership {

    private final CommunityPostRepository postRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean isOwnedByShareCode(String shareCode, UUID userId) {
        if (shareCode == null || shareCode.isBlank() || userId == null) {
            return false;
        }
        return postRepository.findByShareCode(shareCode)
                .map(CommunityPost::getUserId)
                .map(userId::equals)
                .orElse(false);
    }
}
