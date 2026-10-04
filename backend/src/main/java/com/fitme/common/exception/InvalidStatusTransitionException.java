package com.fitme.common.exception;

public class InvalidStatusTransitionException extends BusinessException {

    public static final String CODE = "INVALID_STATUS_TRANSITION";

    public InvalidStatusTransitionException() {
        super("Không thể chuyển sang trạng thái này", CODE);
    }
}
