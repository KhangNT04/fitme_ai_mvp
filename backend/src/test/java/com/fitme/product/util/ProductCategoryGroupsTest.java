package com.fitme.product.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductCategoryGroupsTest {

    @Test
    void resolveGroup_mapsSeedCategories() {
        assertEquals("Áo", ProductCategoryGroups.resolveGroup("Áo thun"));
        assertEquals("Áo", ProductCategoryGroups.resolveGroup("Áo sơ mi"));
        assertEquals("Quần", ProductCategoryGroups.resolveGroup("Quần jean"));
        assertEquals("Quần", ProductCategoryGroups.resolveGroup("Quần tây"));
        assertEquals("Giày", ProductCategoryGroups.resolveGroup("Giày sneaker"));
        assertEquals("Áo khoác", ProductCategoryGroups.resolveGroup("Áo khoác dạ"));
    }

    @Test
    void matchesGroup_filtersByCanonicalGroup() {
        assertTrue(ProductCategoryGroups.matchesGroup("Áo thun", "Áo"));
        assertTrue(ProductCategoryGroups.matchesGroup("Quần jean", "Quần"));
        assertFalse(ProductCategoryGroups.matchesGroup("Áo thun", "Quần"));
        assertFalse(ProductCategoryGroups.matchesGroup("Áo khoác", "Áo"));
    }
}
