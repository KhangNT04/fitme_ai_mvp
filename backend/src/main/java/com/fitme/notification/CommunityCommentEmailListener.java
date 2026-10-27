package com.fitme.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends comment notification emails only once the comment is committed, off the request thread. */
@Component
@RequiredArgsConstructor
public class CommunityCommentEmailListener {

    private final CommunityCommentEmailService emails;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCommunityCommentEvent(CommunityCommentEvent event) {
        emails.send(event);
    }
}
