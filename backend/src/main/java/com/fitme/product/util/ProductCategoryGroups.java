package com.fitme.product.util;

import java.util.Locale;
import java.util.Set;

/**
 * Maps product category labels (brand-specific or seed variants) to the six
 * consumer-facing filter groups shown in Discover.
 */
public final class ProductCategoryGroups {

    public static final String TOPS = "Áo";
    public static final String BOTTOMS = "Quần";
    public static final String DRESSES = "Váy";
    public static final String OUTERWEAR = "Áo khoác";
    public static final String SHOES = "Giày";
    public static final String ACCESSORIES = "Phụ kiện";

    public static final Set<String> CANONICAL = Set.of(
            TOPS, BOTTOMS, DRESSES, OUTERWEAR, SHOES, ACCESSORIES
    );

    private ProductCategoryGroups() {
    }

    /** Resolve a stored category string to a canonical filter group, or null if unknown. */
    public static String resolveGroup(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }

        String trimmed = category.trim();
        for (String group : CANONICAL) {
            if (group.equalsIgnoreCase(trimmed)) {
                return group;
            }
        }

        String normalized = trimmed.toLowerCase(Locale.ROOT);

        if (containsAny(normalized, "khoác", "outerwear", "jacket", "coat", "blazer")) {
            return OUTERWEAR;
        }
        if (containsAny(normalized, "phụ kiện", "accessory", "accessories", "túi", "bag", "mũ", "hat", "belt")) {
            return ACCESSORIES;
        }
        if (containsAny(normalized, "giày", "sneaker", "shoe", "boot", "sandal", "footwear")) {
            return SHOES;
        }
        if (containsAny(normalized, "váy", "dress", "skirt", "one piece", "one-piece", "one_piece")) {
            return DRESSES;
        }
        if (containsAny(normalized, "quần", "bottom", "jean", "pant", "trouser", "short")) {
            return BOTTOMS;
        }
        if (normalized.startsWith("áo")
                || containsAny(normalized, "top", "shirt", "tee", "t-shirt", "blouse", "sơ mi", "thun", "hoodie", "sweater")) {
            return TOPS;
        }

        return trimmed;
    }

    public static boolean matchesGroup(String productCategory, String filterGroup) {
        if (filterGroup == null || filterGroup.isBlank()) {
            return true;
        }
        String resolved = resolveGroup(productCategory);
        return filterGroup.equalsIgnoreCase(resolved);
    }

    public static boolean sameGroup(String leftCategory, String rightCategory) {
        if (leftCategory == null || rightCategory == null) {
            return false;
        }
        String left = resolveGroup(leftCategory);
        String right = resolveGroup(rightCategory);
        return left != null && left.equalsIgnoreCase(right);
    }

    private static boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
