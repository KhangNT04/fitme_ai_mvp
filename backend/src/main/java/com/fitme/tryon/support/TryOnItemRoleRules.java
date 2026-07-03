package com.fitme.tryon.support;

import com.fitme.common.enums.ItemRole;

import java.util.EnumSet;
import java.util.Set;

public final class TryOnItemRoleRules {

    private TryOnItemRoleRules() {
    }

    public static Set<ItemRole> rolesToReplaceWhenAdding(ItemRole role) {
        return switch (role) {
            case ONE_PIECE -> EnumSet.of(ItemRole.ONE_PIECE, ItemRole.TOP, ItemRole.BOTTOM);
            case TOP, BOTTOM -> EnumSet.of(role, ItemRole.ONE_PIECE);
            default -> EnumSet.of(role);
        };
    }
}
