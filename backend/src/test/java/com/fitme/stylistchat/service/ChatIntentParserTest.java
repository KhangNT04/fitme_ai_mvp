package com.fitme.stylistchat.service;

import com.fitme.recommendation.service.UserStylingContextService;
import com.fitme.userprofile.entity.BodyProfile;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ChatIntentParserTest {

    private final ChatIntentParser parser = new ChatIntentParser(new UserStylingContextService());

    @Test
    void detectsStreetwearAndCafe() {
        var intent = parser.parse("Mình là nghệ sĩ đường phố, muốn streetwear đi cafe");
        assertEquals("Đi cafe", intent.occasion());
        assertTrue(intent.styleLabels().contains("Streetwear"));
    }

    @Test
    void detectsOffice() {
        var intent = parser.parse("Đi làm văn phòng thanh lịch");
        assertEquals("Đi làm", intent.occasion());
        assertTrue(intent.styleLabels().contains("Office Chic"));
    }

    @Test
    void fallsBackToAgeAppropriateStylesForMatureUser() {
        BodyProfile body = BodyProfile.builder().age(50).build();
        var intent = parser.parse("Gợi ý đồ đẹp cho mình", body);
        assertFalse(intent.styleLabels().isEmpty());
        assertTrue(intent.styleLabels().size() <= 4);
        assertTrue(intent.styleLabels().contains("Minimal") || intent.styleLabels().contains("Office Chic"));
        assertFalse(intent.styleLabels().contains("Streetwear"));
    }

    @Test
    void keepsStreetwearWhenMatureUserExplicitlyAsks() {
        BodyProfile body = BodyProfile.builder().age(50).build();
        var intent = parser.parse("Mình muốn streetwear năng động đi cafe", body);
        assertTrue(intent.styleLabels().contains("Streetwear"));
    }
}
