package com.fitme.ai;

import com.fitme.common.enums.ItemRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VtonCategoryMapperTest {

    @Test
    void toVtonCategory_mapsRoles() {
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.TOP)).isEqualTo("tops");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.OUTERWEAR)).isEqualTo("tops");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.BOTTOM)).isEqualTo("bottoms");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.ONE_PIECE)).isEqualTo("one-pieces");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.SHOES)).isNull();
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.ACCESSORY)).isNull();
    }

    @Test
    void isSupportedRole_excludesShoesAndAccessory() {
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.TOP)).isTrue();
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.ONE_PIECE)).isTrue();
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.SHOES)).isFalse();
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.ACCESSORY)).isFalse();
    }
}
