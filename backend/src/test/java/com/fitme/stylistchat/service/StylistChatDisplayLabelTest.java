package com.fitme.stylistchat.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StylistChatDisplayLabelTest {

    @Test
    void mapsOfficeChicToOccasionWhenPresent() {
        assertThat(StylistChatService.toDisplayStyleLabel("Office Chic", "Đi làm"))
                .isEqualTo("Đi làm");
    }

    @Test
    void mapsOfficeChicToDiLamByDefault() {
        assertThat(StylistChatService.toDisplayStyleLabel("Office Chic", null))
                .isEqualTo("Đi làm");
        assertThat(StylistChatService.toDisplayStyleLabel("Office Chic", "Casual hàng ngày"))
                .isEqualTo("Đi làm");
    }

    @Test
    void mapsStreetwearAndSporty() {
        assertThat(StylistChatService.toDisplayStyleLabel("Streetwear", null)).isEqualTo("Đi chơi");
        assertThat(StylistChatService.toDisplayStyleLabel("Sporty", null)).isEqualTo("Thể thao");
    }
}
