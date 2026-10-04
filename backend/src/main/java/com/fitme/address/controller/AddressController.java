package com.fitme.address.controller;

import com.fitme.address.dto.AddressDto;
import com.fitme.address.dto.AddressRequest;
import com.fitme.address.service.AddressService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ApiResponse<List<AddressDto>> list() {
        return ApiResponse.ok(addressService.list(RequestContext.requireUserId()));
    }

    @PostMapping
    public ApiResponse<AddressDto> create(@Valid @RequestBody AddressRequest request) {
        return ApiResponse.ok(addressService.create(RequestContext.requireUserId(), request));
    }

    @PutMapping("/{id}")
    public ApiResponse<AddressDto> update(@PathVariable UUID id, @Valid @RequestBody AddressRequest request) {
        return ApiResponse.ok(addressService.update(RequestContext.requireUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        addressService.delete(RequestContext.requireUserId(), id);
        return ApiResponse.ok(null);
    }
}
