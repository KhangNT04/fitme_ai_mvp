package com.fitme.common.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.support.TestDataHelper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class P0SecurityIntegrationTest extends AbstractIntegrationTest {

    private static final String UNSUPPORTED_IMAGE = "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP";
    private static final ResultMatcher NO_SERVER_ERROR =
            result -> assertThat(result.getResponse().getStatus()).as("HTTP status").isLessThan(500);

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbc;

    // ---------------------------------------------------------------- SEC-AUZ-05 / SEC-AUZ-06

    /** SEC-AUZ-05 */
    @Test
    void tamperedRoleClaimWithOriginalSignature_isRejected() throws Exception {
        UserAccount consumer = testDataHelper.createUser().user();
        UserAccount admin = testDataHelper.createAdmin().user();
        String token = jwtService.generateAccessToken(consumer.getId(), consumer.getEmail(), "USER");
        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        String[] parts = token.split("\\.");
        ObjectNode claims = (ObjectNode) objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
        claims.put("role", "ADMIN");
        String roleOnly = parts[0] + "." + b64(claims.toString()) + "." + parts[2];
        claims.put("sub", admin.getEmail());
        claims.put("userId", admin.getId().toString());
        String impersonating = parts[0] + "." + b64(claims.toString()) + "." + parts[2];

        for (String forged : List.of(roleOnly, impersonating)) {
            mockMvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + forged))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + forged))
                    .andExpect(status().is4xxClientError());
        }

        String foreignKey = Jwts.builder()
                .subject(admin.getEmail())
                .claims(Map.of("userId", admin.getId().toString(), "type", "access", "role", "ADMIN"))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3_600_000))
                .signWith(Keys.hmacShaKeyFor("attacker-controlled-secret-that-is-long-enough!!".getBytes(StandardCharsets.UTF_8)))
                .compact();
        mockMvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + foreignKey))
                .andExpect(status().isForbidden());
    }

    /** SEC-AUZ-06 */
    @Test
    void unsignedAlgNoneToken_isRejected() throws Exception {
        UserAccount admin = testDataHelper.createAdmin().user();
        long now = System.currentTimeMillis() / 1000;
        String header = b64("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        String payload = b64(objectMapper.writeValueAsString(Map.of(
                "sub", admin.getEmail(),
                "userId", admin.getId().toString(),
                "type", "access",
                "role", "ADMIN",
                "iat", now,
                "exp", now + 3600)));

        for (String forged : List.of(header + "." + payload + ".", header + "." + payload)) {
            mockMvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + forged))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + forged))
                    .andExpect(status().isForbidden());
        }
    }

    // ---------------------------------------------------------------- SEC-INJ-01 / CAT-DIS-06

    /** CAT-DIS-06 + SEC-INJ-01 (public catalog search and filters) */
    @Test
    void catalogSearchAndFilters_treatSqlAndWildcardsAsPlainText() throws Exception {
        testDataHelper.createEligibleProduct("Áo thun P0 " + UUID.randomUUID(), "Áo thun");
        int all = listProducts(Map.of()).size();
        assertThat(all).isPositive();

        for (String injection : List.of("' OR 1=1 --", "' OR '1'='1", "'; DROP TABLE users;--")) {
            assertThat(listProducts(Map.of("search", injection))).as(injection).isEmpty();
            for (String filter : List.of("category", "style", "occasion", "color", "sizeLabel")) {
                assertThat(listProducts(Map.of(filter, injection))).as(filter + "=" + injection).isEmpty();
            }
        }
        for (String wildcard : List.of("%", "_", "%%", "%_%")) {
            assertThat(listProducts(Map.of("search", wildcard)).size()).as(wildcard).isLessThan(all);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_accounts", Long.class)).isPositive();
    }

    /** CAT-DIS-06: malformed / abusive query params never surface as a server error. */
    @Test
    void catalogMalformedQueryParams_neverReturnServerError() throws Exception {
        List<Map<String, String>> abusive = List.of(
                Map.of("priceMin", "abc"),
                Map.of("priceMax", "1e999999"),
                Map.of("priceMin", "-1", "priceMax", "-999999999999999999999"),
                Map.of("brandId", "not-a-uuid"),
                Map.of("brandId", "' OR 1=1 --"),
                Map.of("fitType", "DROP_TABLE"),
                Map.of("aiTryOnEligible", "maybe"),
                Map.of("size", "100000"),
                Map.of("page", "-1", "size", "999999999"),
                Map.of("search", "a".repeat(5000)));
        for (Map<String, String> params : abusive) {
            MockHttpServletRequestBuilder request = get("/api/v1/products");
            params.forEach(request::param);
            mockMvc.perform(request).andExpect(NO_SERVER_ERROR);
        }
        assertThat(listProducts(Map.of("size", "100000"))).isEmpty();
    }

    /** SEC-INJ-01 (admin account search) */
    @Test
    void adminUserSearch_isParameterizedEscapedAndPageBounded() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        for (String injection : List.of("' OR '1'='1", "'; DROP TABLE users;--", "%", "_", "\\")) {
            mockMvc.perform(get("/api/v1/admin/users").param("q", injection).with(user(admin)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.total").value(0))
                    .andExpect(jsonPath("$.data.items.length()").value(0));
        }
        mockMvc.perform(get("/api/v1/admin/users").param("status", "ACTIVE' OR '1'='1").with(user(admin)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/admin/users")
                        .param("page", "-5").param("size", "100000").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(100));
        mockMvc.perform(get("/api/v1/admin/users").param("page", "abc").with(user(admin)))
                .andExpect(NO_SERVER_ERROR);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_accounts", Long.class)).isPositive();
    }

    // ---------------------------------------------------------------- SEC-UPL-01 / SEC-UPL-02

    private static final byte[] SVG = """
            <svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(document.cookie)</script></svg>
            """.getBytes(StandardCharsets.UTF_8);
    private static final byte[] HTML = "<html><body><script>alert(1)</script></body></html>".getBytes(StandardCharsets.UTF_8);
    private static final byte[] EXE = new byte[]{'M', 'Z', (byte) 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, (byte) 0xFF, (byte) 0xFF};

    /** SEC-UPL-01: script-carrying SVG is rejected by every upload endpoint. */
    @Test
    void svgWithScript_isRejectedEverywhere() throws Exception {
        List<MockMultipartFile> svgs = List.of(
                new MockMultipartFile("file", "evil.svg", "image/svg+xml", SVG),
                new MockMultipartFile("file", "evil.png", "image/png", SVG));
        assertEveryUploadEndpointRejects(svgs);
    }

    /** SEC-UPL-02: HTML / EXE bytes declared as image/jpeg are rejected by content sniffing on every endpoint. */
    @Test
    void nonImageBytesDeclaredAsJpeg_areRejectedEverywhere() throws Exception {
        List<MockMultipartFile> fakes = List.of(
                new MockMultipartFile("file", "photo.jpg", "image/jpeg", HTML),
                new MockMultipartFile("file", "photo.jpg", "image/jpeg", EXE));
        assertEveryUploadEndpointRejects(fakes);
    }

    private void assertEveryUploadEndpointRejects(List<MockMultipartFile> files) throws Exception {
        String sessionToken = createAnonymousSessionToken();
        String consentId = objectMapper.readTree(mockMvc.perform(post("/api/v1/uploads/user-photo/consent")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
        FitMeUserPrincipal premium = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());
        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consentType\":\"WARDROBE_IMAGE_UPLOAD\",\"accepted\":true}"))
                .andExpect(status().isOk());
        String wardrobeItemId = objectMapper.readTree(mockMvc.perform(post("/api/v1/wardrobe/items")
                        .with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo test\",\"itemType\":\"TOP\",\"category\":\"Áo thun\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
        String consumerToken = registerUserAccessToken();
        FitMeUserPrincipal brandOwner = new FitMeUserPrincipal(testDataHelper.createBrandOwner().user());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        Map<String, Function<MockMultipartFile, MockHttpServletRequestBuilder>> endpoints = Map.of(
                "try-on photo", file -> multipart("/api/v1/uploads/user-photo")
                        .file(file).param("consentId", consentId).header(SESSION_HEADER, sessionToken),
                "wardrobe", file -> multipart("/api/v1/wardrobe/items/{id}/image", wardrobeItemId)
                        .file(file).with(user(premium)),
                "review", file -> multipart("/api/v1/reviews/images")
                        .file(file).header("Authorization", "Bearer " + consumerToken),
                "brand logo", file -> multipart("/api/v1/brand/me/logo").file(file).with(user(brandOwner)),
                "brand product image", file -> multipart("/api/v1/brand/media/images").file(file).with(user(brandOwner)),
                "admin try-on avatar", file -> multipart("/api/v1/admin/tryon-avatars/images").file(file).with(user(admin)));

        List<String> accepted = new ArrayList<>();
        for (var endpoint : endpoints.entrySet()) {
            for (MockMultipartFile file : files) {
                MvcResult result = mockMvc.perform(endpoint.getValue().apply(file)).andReturn();
                JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
                if (result.getResponse().getStatus() != 400 || !UNSUPPORTED_IMAGE.equals(body.path("error").asText())) {
                    accepted.add(endpoint.getKey() + " / " + file.getOriginalFilename() + " (" + file.getContentType()
                            + ") -> " + result.getResponse().getStatus() + " " + body.path("error").asText());
                }
            }
        }
        assertThat(accepted).as("uploads that were not rejected as unsupported images").isEmpty();
    }

    // ---------------------------------------------------------------- SEC-CFG-02

    /** SEC-CFG-02 */
    @Test
    void cors_unknownOriginGetsNoAllowOriginHeader() throws Exception {
        mockMvc.perform(get("/api/v1/plans").header(HttpHeaders.ORIGIN, "https://evil.com"))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, "https://evil.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Authorization"))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS));

        mockMvc.perform(get("/api/v1/plans").header(HttpHeaders.ORIGIN, "http://localhost:3000"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }

    // ---------------------------------------------------------------- SEC-ABU-02

    /** SEC-ABU-02 */
    @Test
    @Disabled("KNOWN GAP: no per-IP / per-client registration limit and the captcha is a plain-text sum that a "
            + "script solves; mass sign-ups each collect the 5 trial Fitken. Needs a product decision on the limit "
            + "(and a real captcha / shared rate-limit store) before it can be built.")
    void massRegistrationFromOneClient_isThrottled() throws Exception {
        List<Integer> statuses = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            JsonNode captcha = objectMapper.readTree(mockMvc.perform(get("/api/v1/auth/captcha"))
                    .andReturn().getResponse().getContentAsString()).get("data");
            statuses.add(mockMvc.perform(post("/api/v1/auth/register")
                            .with(request -> {
                                request.setRemoteAddr("203.0.113.7");
                                return request;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "email", "farm-" + UUID.randomUUID() + "@test.fitme.ai",
                                    "password", "Test12345!",
                                    "displayName", "Farm",
                                    "website", "",
                                    "captchaId", captcha.get("captchaId").asText(),
                                    "captchaAnswer", String.valueOf(parseCaptchaAnswer(captcha.get("question").asText())),
                                    "formStartedAtMs", System.currentTimeMillis() - 5_000))))
                    .andReturn().getResponse().getStatus());
        }
        assertThat(statuses).contains(429);
    }

    // ---------------------------------------------------------------- helpers

    private JsonNode listProducts(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/products");
        params.forEach(request::param);
        String body = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("data");
    }

    private static String b64(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }
}
