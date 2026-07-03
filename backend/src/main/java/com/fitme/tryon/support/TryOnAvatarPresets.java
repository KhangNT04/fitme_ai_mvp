package com.fitme.tryon.support;

import java.util.Map;
import java.util.Set;

public final class TryOnAvatarPresets {

    private static final Map<String, String> PRESETS = Map.of(
            "avatar-female-1", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=800&q=80",
            "avatar-female-2", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&h=800&q=80",
            "avatar-male-1", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=800&q=80",
            "avatar-male-2", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&h=800&q=80",
            "avatar-neutral-1", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=800&q=80",
            "avatar-neutral-2", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&h=800&q=80"
    );

    private TryOnAvatarPresets() {
    }

    public static boolean isValid(String key) {
        return key != null && PRESETS.containsKey(key);
    }

    public static String imageUrl(String key) {
        return PRESETS.get(key);
    }

    public static Set<String> keys() {
        return PRESETS.keySet();
    }
}
