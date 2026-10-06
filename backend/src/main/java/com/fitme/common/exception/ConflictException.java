package com.fitme.common.exception;

import lombok.Getter;

/** The request is valid but clashes with the resource's current state (HTTP 409). */
@Getter
public class ConflictException extends RuntimeException {

    private final String code;

    public ConflictException(String message, String code) {
        super(message);
        this.code = code;
    }
}
