package com.fitme.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String error;
    /** Machine-readable failure reason (e.g. FITKEN_INSUFFICIENT) for frontend branching. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String errorCode;

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> fail(String error) {
        return new ApiResponse<>(false, null, error, null);
    }

    public static <T> ApiResponse<T> fail(String error, String errorCode) {
        return new ApiResponse<>(false, null, error, errorCode);
    }
}
