package com.fitme.brandvoucher.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/** Human-readable voucher codes like FITME-7KQ2-M9XD (no 0/O/1/I/L to avoid misreading). */
@Component
public class BrandVoucherCodeGenerator {

    private static final char[] ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();
    private static final int GROUP_LENGTH = 4;

    private final SecureRandom random = new SecureRandom();

    public String next() {
        return "FITME-" + group() + "-" + group();
    }

    private String group() {
        char[] chars = new char[GROUP_LENGTH];
        for (int i = 0; i < GROUP_LENGTH; i++) {
            chars[i] = ALPHABET[random.nextInt(ALPHABET.length)];
        }
        return new String(chars);
    }
}
