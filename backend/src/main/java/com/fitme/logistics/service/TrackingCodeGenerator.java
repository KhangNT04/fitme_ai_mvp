package com.fitme.logistics.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;

/** Placeholder tracking codes ({@code FM-<epochMillis>-<rand>}) for sellers that do not enter a carrier code. */
@Component
public class TrackingCodeGenerator {

    public String next() {
        return "FM-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(1000);
    }
}
