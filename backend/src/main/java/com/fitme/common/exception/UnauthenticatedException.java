package com.fitme.common.exception;

public class UnauthenticatedException extends RuntimeException {
    public UnauthenticatedException(String message) {
        super(message);
    }
}
