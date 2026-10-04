package com.fitme.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminTryOnAvatarIntegrationTest extends AbstractIntegrationTest {

    private static final byte[] MINIMAL_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9
    };

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void seededAvatarsArePublic_andOnlyAdminsCanManage() throws Exception {
        JsonNode avatars = publicAvatars();
        assertThat(keys(avatars)).contains("avatar-male-1", "avatar-male-2", "avatar-female-1");
        assertThat(avatars.get(0).get("imageUrl").asText()).startsWith("/catalog/tryon-avatars/");

        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(get("/api/v1/admin/tryon-avatars").with(user(consumer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCreatesHidesReordersAndDeletesAvatar() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        String imageUrl = objectMapper.readTree(mockMvc.perform(multipart("/api/v1/admin/tryon-avatars/images")
                                .file(new MockMultipartFile("file", "model.jpg", "image/jpeg", MINIMAL_JPEG))
                                .with(user(admin)))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString())
                .get("data").get("url").asText();
        assertThat(imageUrl).startsWith("/uploads/tryon-avatars/");

        upsert(post("/api/v1/admin/tryon-avatars"), admin, "{\"label\":\"  \",\"imageUrl\":\"" + imageUrl + "\"}")
                .andExpect(status().isBadRequest());
        upsert(post("/api/v1/admin/tryon-avatars"), admin, "{\"label\":\"X\",\"imageUrl\":\"javascript:alert(1)\"}")
                .andExpect(status().isBadRequest());

        JsonNode created = objectMapper.readTree(upsert(post("/api/v1/admin/tryon-avatars"), admin,
                        "{\"label\":\"Mẫu thử\",\"imageUrl\":\"" + imageUrl + "\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true))
                .andReturn().getResponse().getContentAsString()).get("data");
        String id = created.get("id").asText();
        String key = created.get("key").asText();
        assertThat(keys(publicAvatars())).contains(key);
        createAvatarTryOn(key).andExpect(status().isOk());

        JsonNode reordered = objectMapper.readTree(mockMvc.perform(post("/api/v1/admin/tryon-avatars/{id}/move", id)
                                .with(user(admin))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"direction\":\"UP\"}"))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString())
                .get("data");
        List<String> order = keys(reordered);
        assertThat(order.indexOf(key)).isEqualTo(order.size() - 2);

        upsert(put("/api/v1/admin/tryon-avatars/{id}", id), admin, "{\"active\":false,\"label\":\"Mẫu ẩn\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.label").value("Mẫu ẩn"));
        assertThat(keys(publicAvatars())).doesNotContain(key);
        createAvatarTryOn(key).andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/v1/admin/tryon-avatars/{id}", id).with(user(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/tryon-avatars").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.key == '" + key + "')]").isEmpty())
                .andExpect(jsonPath("$.data[-1].displayOrder").value(3));
    }

    private ResultActions upsert(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
                                 FitMeUserPrincipal admin, String body) throws Exception {
        return mockMvc.perform(request.with(user(admin)).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions createAvatarTryOn(String avatarKey) throws Exception {
        return mockMvc.perform(post("/api/v1/try-on/requests")
                .header(SESSION_HEADER, createAnonymousSessionToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"previewMode\":\"AVATAR\",\"avatarKey\":\"" + avatarKey
                        + "\",\"heightCm\":165,\"weightKg\":55}"));
    }

    private JsonNode publicAvatars() throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/api/v1/try-on/avatars"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data");
    }

    private static List<String> keys(JsonNode avatars) {
        List<String> keys = new ArrayList<>();
        avatars.forEach(avatar -> keys.add(avatar.get("key").asText()));
        return keys;
    }
}
