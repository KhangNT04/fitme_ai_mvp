package com.fitme.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends account security emails only once the credential change is committed, off the request thread. */
@Component
@RequiredArgsConstructor
public class AccountSecurityEmailListener {

    private final AccountSecurityEmailService emails;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAccountSecurityEvent(AccountSecurityEvent event) {
        emails.send(event);
    }
}
