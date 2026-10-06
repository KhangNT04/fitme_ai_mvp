package com.fitme.common.exception;

/** Rate or attempt limit reached; mapped to HTTP 429. */
public class TooManyRequestsException extends BusinessException {

    public TooManyRequestsException(String message, String code) {
        super(message, code);
    }
}
