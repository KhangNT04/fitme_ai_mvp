package com.fitme.brandvoucher.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class IssueVouchersRequest {
    @NotEmpty(message = "Chọn ít nhất một brand")
    @Size(max = 200, message = "Mỗi lần phát tối đa 200 brand")
    private List<UUID> brandIds;
}
