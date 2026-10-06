package com.fitme.preference;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.BrandMixMode;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.preference.service.BrandPreferenceService;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PremiumPersonalizationIntegrationTest extends AbstractIntegrationTest {

    private static final String PREFS = "/api/v1/me/brand-preferences";

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private BrandPreferenceService brandPreferenceService;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void freeUserCanReadButNotSaveBrandPreferences() throws Exception {
        FitMeUserPrincipal free = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Brand brand = testDataHelper.createApprovedBrand();

        mockMvc.perform(get(PREFS).with(user(free)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("DIVERSE"))
                .andExpect(jsonPath("$.data.brandIds.length()").value(0))
                .andExpect(jsonPath("$.data.premium").value(false));

        mockMvc.perform(put(PREFS).with(user(free))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(prefsJson("FAVORITES_ONLY", List.of(brand.getId()))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("PREMIUM_REQUIRED"));

        mockMvc.perform(get(PREFS)).andExpect(status().is4xxClientError());
    }

    @Test
    void freeUserFavoritesNeverReachScoring() {
        UUID userId = testDataHelper.createUser().user().getId();
        Brand brand = testDataHelper.createApprovedBrand();
        jdbc.update("INSERT INTO user_favorite_brands (user_id, brand_id) VALUES (?, ?)", userId, brand.getId());
        jdbc.update("UPDATE user_accounts SET brand_mix_mode = 'FAVORITES_ONLY' WHERE id = ?", userId);

        BrandPreferenceService.ScoringPreference scoring = brandPreferenceService.forScoring(userId);
        assertThat(scoring.favoriteBrandIds()).isEmpty();
        assertThat(scoring.mode()).isEqualTo(BrandMixMode.DIVERSE);
    }

    @Test
    void premiumUserSavesValidatedBrandPreferences() throws Exception {
        FitMeUserPrincipal premium = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());
        Brand approved = testDataHelper.createApprovedBrand();
        UUID pendingBrandId = testDataHelper.createApprovedBrand().getId();
        jdbc.update("UPDATE brands SET status = 'PENDING' WHERE id = ?", pendingBrandId);

        mockMvc.perform(put(PREFS).with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(prefsJson("DIVERSE", List.of(approved.getId(), pendingBrandId))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_PREFERENCE_INVALID"));

        List<UUID> tooMany = new ArrayList<>();
        for (int i = 0; i < 11; i++) {
            tooMany.add(testDataHelper.createApprovedBrand().getId());
        }
        mockMvc.perform(put(PREFS).with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(prefsJson("DIVERSE", tooMany)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_PREFERENCE_INVALID"));

        mockMvc.perform(put(PREFS).with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(prefsJson("FAVORITES_ONLY", List.of(approved.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("FAVORITES_ONLY"))
                .andExpect(jsonPath("$.data.brandIds[0]").value(approved.getId().toString()))
                .andExpect(jsonPath("$.data.brands[0].name").value(approved.getName()))
                .andExpect(jsonPath("$.data.premium").value(true));

        mockMvc.perform(get(PREFS).with(user(premium)))
                .andExpect(jsonPath("$.data.mode").value("FAVORITES_ONLY"))
                .andExpect(jsonPath("$.data.brandIds.length()").value(1));
    }

    @Test
    void favoritesOnlyRanksOutfitsFromFavoriteBrands() throws Exception {
        FitMeUserPrincipal premium = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());
        // Other brands in the shared catalog compete for every role.
        testDataHelper.createEligibleProduct("Áo thun brand khác", "Áo thun");
        testDataHelper.createEligibleProduct("Quần jean brand khác", "Quần jean");
        testDataHelper.createEligibleProduct("Giày brand khác", "Giày sneaker");
        Brand favorite = testDataHelper.createApprovedBrand();
        testDataHelper.createEligibleProductForBrand(favorite, "Áo sơ mi yêu thích", "Áo sơ mi");
        testDataHelper.createEligibleProductForBrand(favorite, "Quần tây yêu thích", "Quần tây");
        testDataHelper.createEligibleProductForBrand(favorite, "Giày lười yêu thích", "Giày");

        saveProfiles(premium);
        mockMvc.perform(put(PREFS).with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(prefsJson("FAVORITES_ONLY", List.of(favorite.getId()))))
                .andExpect(status().isOk());

        List<JsonNode> productItems = generateAndCollectProductItems(premium, "NO_WARDROBE_DATA");
        assertThat(productItems).isNotEmpty();
        assertThat(productItems)
                .allSatisfy(item -> assertThat(item.get("brandId").asText()).isEqualTo(favorite.getId().toString()));
    }

    @Test
    void freeUserWardrobeModeFallsBackToBrandOnly() throws Exception {
        FitMeUserPrincipal free = new FitMeUserPrincipal(testDataHelper.createUser().user());
        jdbc.update("INSERT INTO wardrobe_items (user_id, name, category, item_type) VALUES (?, 'Áo cũ của tôi', 'Áo thun', 'TOP')",
                free.getUserId());
        testDataHelper.createEligibleProduct("Áo thun fallback", "Áo thun");
        testDataHelper.createEligibleProduct("Quần jean fallback", "Quần jean");
        saveProfiles(free);

        String body = mockMvc.perform(post("/api/v1/recommendations").with(user(free))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wardrobeMode\": \"USE_WARDROBE_FIRST\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(body).get("data").get("requestId").asText();
        assertThat(jdbc.queryForObject("SELECT wardrobe_mode FROM outfit_requests WHERE id = ?::uuid",
                String.class, requestId)).isEqualTo("NO_WARDROBE_DATA");

        for (JsonNode option : objectMapper.readTree(body).get("data").get("options")) {
            JsonNode detail = objectMapper.readTree(mockMvc.perform(
                            get("/api/v1/recommendations/{id}", option.get("recommendationId").asText()).with(user(free)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString()).get("data");
            for (JsonNode item : detail.get("outfitItems")) {
                assertThat(item.path("wardrobeItemId").isNull() || item.path("wardrobeItemId").isMissingNode())
                        .as("free users never get wardrobe items").isTrue();
            }
        }
    }

    @Test
    void premiumUserKeepsWardrobeMode() throws Exception {
        FitMeUserPrincipal premium = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());
        testDataHelper.createEligibleProduct("Áo thun premium", "Áo thun");
        testDataHelper.createEligibleProduct("Quần jean premium", "Quần jean");
        saveProfiles(premium);

        String body = mockMvc.perform(post("/api/v1/recommendations").with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wardrobeMode\": \"MIX_WARDROBE_AND_BRAND\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(body).get("data").get("requestId").asText();
        assertThat(jdbc.queryForObject("SELECT wardrobe_mode FROM outfit_requests WHERE id = ?::uuid",
                String.class, requestId)).isEqualTo("MIX_WARDROBE_AND_BRAND");
    }

    private void saveProfiles(FitMeUserPrincipal principal) throws Exception {
        mockMvc.perform(post("/api/v1/me/body-profile").with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"heightCm\": 168, \"weightKg\": 60, \"gender\": \"FEMALE\", \"fitPreference\": \"REGULAR\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/me/style-profile").with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    private List<JsonNode> generateAndCollectProductItems(FitMeUserPrincipal principal, String wardrobeMode)
            throws Exception {
        String body = mockMvc.perform(post("/api/v1/recommendations").with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wardrobeMode\": \"%s\"}".formatted(wardrobeMode)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<JsonNode> items = new ArrayList<>();
        for (JsonNode option : objectMapper.readTree(body).get("data").get("options")) {
            JsonNode detail = objectMapper.readTree(mockMvc.perform(
                            get("/api/v1/recommendations/{id}", option.get("recommendationId").asText())
                                    .with(user(principal)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString()).get("data");
            for (JsonNode item : detail.get("outfitItems")) {
                if (item.hasNonNull("productId")) {
                    items.add(item);
                }
            }
        }
        return items;
    }

    private String prefsJson(String mode, List<UUID> brandIds) {
        String ids = brandIds.stream().map(id -> "\"" + id + "\"").reduce((a, b) -> a + "," + b).orElse("");
        return "{\"mode\": \"%s\", \"brandIds\": [%s]}".formatted(mode, ids);
    }
}
