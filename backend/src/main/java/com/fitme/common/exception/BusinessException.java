package com.fitme.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    /** Optional machine-readable code surfaced as {@code ApiResponse.errorCode}. */
    private final String code;

    public BusinessException(String message) {
        this(message, null);
    }

    public BusinessException(String message, String code) {
        super(message);
        this.code = code;
    }
}
