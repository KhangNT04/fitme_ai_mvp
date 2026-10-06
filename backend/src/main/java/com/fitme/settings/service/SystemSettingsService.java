package com.fitme.settings.service;

import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.settings.dto.SystemSettingDto;
import com.fitme.settings.entity.SystemSetting;
import com.fitme.settings.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Admin-editable runtime settings backed by {@code system_settings}. Only known keys are accepted; values are
 * cached in memory, refreshed after {@link #CACHE_TTL} (other instances) and invalidated on every update.
 */
@Service
@RequiredArgsConstructor
public class SystemSettingsService {

    public static final String FITKEN_MAX_BALANCE = "fitken.max_balance";
    public static final String TRYON_PLUS_FREE_DAILY = "tryon.plus_free_daily";
    public static final String RECOMMENDATION_PLUS_BOOST = "recommendation.plus_boost";

    static final Duration CACHE_TTL = Duration.ofSeconds(60);

    public record Definition(String key, String label, String description, int min, int max, int defaultValue) {
    }

    private static final Map<String, Definition> DEFINITIONS = definitions(
            new Definition(FITKEN_MAX_BALANCE,
                    "Trần Fitken miễn phí",
                    "Số dư tối đa mà Fitken miễn phí (dùng thử, điểm danh, chia sẻ, đánh giá) có thể cộng tới. "
                            + "Fitken từ gói Premium, mua thêm hoặc admin điều chỉnh không bị giới hạn.",
                    0, 100_000, 50),
            new Definition(TRYON_PLUS_FREE_DAILY,
                    "Lượt thử đồ miễn phí mỗi ngày (brand Plus)",
                    "Số lượt thử đồ AI miễn phí mỗi ngày cho sản phẩm của brand gói Plus (áp dụng từ phase sau).",
                    0, 100, 3),
            new Definition(RECOMMENDATION_PLUS_BOOST,
                    "Điểm ưu tiên gợi ý (brand Plus)",
                    "Điểm cộng thêm khi xếp hạng sản phẩm của brand gói Plus trong gợi ý outfit (áp dụng từ phase sau).",
                    0, 100, 15));

    private final SystemSettingRepository repository;
    private final AppClock clock;

    private volatile Snapshot cache;

    private record Snapshot(Map<String, SystemSetting> rows, Instant loadedAt) {
    }

    public static List<Definition> knownSettings() {
        return List.copyOf(DEFINITIONS.values());
    }

    /** Typed lookup; unknown or unparsable values fall back to {@code defaultValue}. */
    public int getInt(String key, int defaultValue) {
        SystemSetting row = rows().get(key);
        if (row == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(row.getValue().trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    /** Lookup of a known setting using its built-in default. */
    public int getInt(String key) {
        return getInt(key, definition(key).defaultValue());
    }

    public int fitkenMaxBalance() {
        return Math.max(0, getInt(FITKEN_MAX_BALANCE));
    }

    public List<SystemSettingDto> list() {
        Map<String, SystemSetting> rows = rows();
        return DEFINITIONS.values().stream()
                .map(def -> toDto(def, rows.get(def.key())))
                .toList();
    }

    @Transactional
    public SystemSettingDto update(String key, String rawValue, UUID adminId) {
        Definition def = definition(key);
        int value = parseAndValidate(def, rawValue);
        SystemSetting row = repository.findById(key)
                .orElseGet(() -> SystemSetting.builder().key(key).build());
        row.setValue(Integer.toString(value));
        row.setUpdatedAt(clock.now());
        row.setUpdatedBy(adminId);
        SystemSetting saved = repository.save(row);
        invalidate();
        // A read racing this transaction may have re-cached the old value before commit.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    invalidate();
                }
            });
        }
        return toDto(def, saved);
    }

    public void invalidate() {
        cache = null;
    }

    static int parseAndValidate(Definition def, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new BusinessException("Vui lòng nhập giá trị cho \"" + def.label() + "\"", "SETTING_INVALID");
        }
        int value;
        try {
            value = Integer.parseInt(rawValue.trim());
        } catch (NumberFormatException ex) {
            throw new BusinessException("\"" + def.label() + "\" phải là số nguyên", "SETTING_INVALID");
        }
        if (value < def.min() || value > def.max()) {
            throw new BusinessException("\"" + def.label() + "\" phải nằm trong khoảng "
                    + def.min() + " - " + def.max(), "SETTING_INVALID");
        }
        return value;
    }

    private Definition definition(String key) {
        Definition def = key != null ? DEFINITIONS.get(key) : null;
        if (def == null) {
            throw new NotFoundException("Cài đặt không tồn tại");
        }
        return def;
    }

    private Map<String, SystemSetting> rows() {
        Snapshot snapshot = cache;
        Instant now = Instant.now();
        if (snapshot == null || snapshot.loadedAt().plus(CACHE_TTL).isBefore(now)) {
            Map<String, SystemSetting> rows = repository.findAll().stream()
                    .collect(Collectors.toMap(SystemSetting::getKey, row -> row, (a, b) -> a));
            snapshot = new Snapshot(Map.copyOf(rows), now);
            cache = snapshot;
        }
        return snapshot.rows();
    }

    private SystemSettingDto toDto(Definition def, SystemSetting row) {
        int value = def.defaultValue();
        if (row != null) {
            try {
                value = Integer.parseInt(row.getValue().trim());
            } catch (NumberFormatException ignored) {
                // keep the default for a corrupted row
            }
        }
        return new SystemSettingDto(def.key(), value, def.defaultValue(), def.label(), def.description(),
                def.min(), def.max(), row != null ? row.getUpdatedAt() : null);
    }

    private static Map<String, Definition> definitions(Definition... defs) {
        Map<String, Definition> map = new LinkedHashMap<>();
        for (Definition def : defs) {
            map.put(def.key(), def);
        }
        return Collections.unmodifiableMap(map);
    }
}
