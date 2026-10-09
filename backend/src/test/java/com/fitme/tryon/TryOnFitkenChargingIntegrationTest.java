package com.fitme.tryon;

import com.fitme.AbstractIntegrationTest;
import com.fitme.ai.client.AiVtonClient;
import com.fitme.ai.client.AiVtonClient.VtonJobResponse;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.fitken.repository.FitkenLedgerRepository;
import com.fitme.fitken.service.FitkenService;
import com.fitme.preview.service.VtonTryOnService;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayDeque;
import java.util.Deque;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fitken charging around a stubbed async VTON provider: charge on start, refund on failure. The scheduled
 * poller is pushed out so only the explicit polls consume the stub's FIFO queue (shared with
 * {@link PlusFreeTryOnIntegrationTest}, which uses the same configuration and therefore the same context).
 */
@TestPropertySource(properties = {
        "fitme.ai.mode=hf",
        "fitme.ai.public-base-url=http://localhost:8080",
        "fitme.ai.poll-interval-ms=3600000"
})
@Import(TryOnFitkenChargingIntegrationTest.StubConfig.class)
class TryOnFitkenChargingIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private VtonTryOnService vtonTryOnService;

    @Autowired
    private FitkenService fitkenService;

    @Autowired
    private FitkenLedgerRepository ledgerRepository;

    @Autowired
    private ProductImageRepository imageRepository;

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void resetStub() {
        StubAiVtonClient.pollQueue.clear();
        StubAiVtonClient.submitResponse = null;
        StubAiVtonClient.lastGarmentUrl = null;
    }

    @Test
    void successfulTryOnSpendsOneFitkenAndLandsInGallery() throws Exception {
        StubAiVtonClient.submitResponse = job("job-charge-ok", "processing", null);
        StubAiVtonClient.pollQueue.add(job("job-charge-ok", "completed", "https://cdn.example/charge-ok.jpg"));
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String requestId = createAvatarTryOn(principal, testDataHelper.createEligibleProduct("Charge top", "Áo thun"));

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSING"))
                .andExpect(jsonPath("$.data.fitkenBalance").value(4));

        vtonTryOnService.pollForTryOn(java.util.UUID.fromString(requestId));

        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(4);
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.REFUND))
                .isZero();
        mockMvc.perform(get("/api/v1/me/gallery").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].imageUrl").value("https://cdn.example/charge-ok.jpg"))
                .andExpect(jsonPath("$.data.items[0].previewSource").value("VTON"));
    }

    @Test
    void submitFailureIsNeverChargedNorStoredInGallery() throws Exception {
        StubAiVtonClient.submitResponse = job(null, "failed", null);
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String requestId = createAvatarTryOn(principal, testDataHelper.createEligibleProduct("Refund top", "Áo thun"));

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.fitkenBalance").value(5));

        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.CONSUME))
                .isZero();
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.REFUND))
                .isZero();
        mockMvc.perform(get("/api/v1/me/gallery").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void providerFailureWhilePollingRefundsTheFitken() throws Exception {
        StubAiVtonClient.submitResponse = job("job-charge-fail", "processing", null);
        StubAiVtonClient.pollQueue.add(job("job-charge-fail", "failed", null));
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String requestId = createAvatarTryOn(principal, testDataHelper.createEligibleProduct("Poll fail top", "Áo thun"));

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fitkenBalance").value(4));
        vtonTryOnService.pollForTryOn(java.util.UUID.fromString(requestId));
        vtonTryOnService.pollForTryOn(java.util.UUID.fromString(requestId));

        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(5);
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.REFUND))
                .isEqualTo(1);
    }

    @Test
    void compositeFallbackFromProviderIsRefundedAndKeptOutOfGallery() throws Exception {
        StubAiVtonClient.submitResponse = job("job-composite", "processing", null);
        VtonJobResponse composite = job("job-composite", "completed", "https://cdn.example/composite.jpg");
        composite.setFallbackMode("composite");
        StubAiVtonClient.pollQueue.add(composite);
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String requestId = createAvatarTryOn(principal, testDataHelper.createEligibleProduct("Composite top", "Áo thun"));

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fitkenBalance").value(4));
        vtonTryOnService.pollForTryOn(java.util.UUID.fromString(requestId));

        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(5);
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.REFUND))
                .isEqualTo(1);
        mockMvc.perform(get("/api/v1/me/gallery").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void generateSendsTheBrandTryOnImageNotTheMainPhoto() throws Exception {
        StubAiVtonClient.submitResponse = job("job-tryon-image", "processing", null);
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Try-on image top", "Áo thun");
        ProductImage tryOn = imageRepository.findByProductIdOrderBySortOrderAsc(product.getId()).getFirst();
        tryOn.setImageUrl("https://media.example/catalog-media/garment-flatlay.jpg");
        tryOn.setSortOrder(1);
        imageRepository.save(tryOn);
        imageRepository.save(ProductImage.builder()
                .productId(product.getId())
                .imageUrl("https://media.example/catalog-media/model-shot.jpg")
                .imageType(ProductImage.TYPE_MAIN)
                .sortOrder(0)
                .build());
        String requestId = createAvatarTryOn(principal, product);

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSING"));

        assertThat(StubAiVtonClient.lastGarmentUrl)
                .isEqualTo("https://media.example/catalog-media/garment-flatlay.jpg");
    }

    @Test
    void itemThatLostItsTryOnImageIsRejectedWithoutCharging() throws Exception {
        StubAiVtonClient.submitResponse = job("job-stale-image", "processing", null);
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Stale image top", "Áo thun");
        String requestId = createAvatarTryOn(principal, product);
        ProductImage tryOn = imageRepository.findByProductIdOrderBySortOrderAsc(product.getId()).getFirst();
        tryOn.setImageType(ProductImage.TYPE_MAIN);
        imageRepository.save(tryOn);

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TRY_ON_ITEM_UNAVAILABLE"))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Stale image top")));

        assertThat(StubAiVtonClient.lastGarmentUrl).isNull();
        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(5);
    }

    @Test
    void hiddenOrIneligibleItemIsRejectedWithoutCharging() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product hidden = testDataHelper.createEligibleProduct("Hidden top", "Áo thun");
        String hiddenRequest = createAvatarTryOn(principal, hidden);
        hidden.setStatus(ProductStatus.INACTIVE);
        productRepository.save(hidden);

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", hiddenRequest).with(user(principal)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TRY_ON_ITEM_UNAVAILABLE"));

        Product ineligible = testDataHelper.createEligibleProduct("Ineligible top", "Áo thun");
        String ineligibleRequest = createAvatarTryOn(principal, ineligible);
        ineligible.setAiTryOnEligible(false);
        productRepository.save(ineligible);

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", ineligibleRequest).with(user(principal)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TRY_ON_ITEM_UNAVAILABLE"));

        assertThat(StubAiVtonClient.lastGarmentUrl).isNull();
        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(5);
    }

    @Test
    void productWithoutTryOnImageCannotBeAdded() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("No image top", "Áo thun");
        ProductImage tryOn = imageRepository.findByProductIdOrderBySortOrderAsc(product.getId()).getFirst();
        tryOn.setImageType(ProductImage.TYPE_MAIN);
        imageRepository.save(tryOn);

        String body = mockMvc.perform(post("/api/v1/try-on/requests")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"previewMode": "AVATAR", "avatarKey": "avatar-female-1"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(body).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "TOP"}
                                """.formatted(product.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TRY_ON_NOT_ELIGIBLE"));
    }

    private static VtonJobResponse job(String jobId, String status, String outputUrl) {
        VtonJobResponse response = new VtonJobResponse();
        response.setJobId(jobId);
        response.setStatus(status);
        response.setOutputImageUrl(outputUrl);
        return response;
    }

    private String createAvatarTryOn(FitMeUserPrincipal principal, Product product) throws Exception {
        String body = mockMvc.perform(post("/api/v1/try-on/requests")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"previewMode": "AVATAR", "avatarKey": "avatar-female-1", "heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(body).get("data").get("id").asText();
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "%s", "selectedSize": "M"}
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());
        return requestId;
    }

    @TestConfiguration
    static class StubConfig {
        @Bean
        @Primary
        AiVtonClient aiVtonClient(FitMeProperties properties) {
            return new StubAiVtonClient(properties);
        }
    }

    static class StubAiVtonClient extends AiVtonClient {
        static VtonJobResponse submitResponse;
        static String lastGarmentUrl;
        static final Deque<VtonJobResponse> pollQueue = new ArrayDeque<>();

        StubAiVtonClient(FitMeProperties properties) {
            super(properties);
        }

        @Override
        public boolean isVtonEnabled() {
            return true;
        }

        @Override
        public boolean isRemoteMode() {
            return true;
        }

        @Override
        public boolean isMockMode() {
            return false;
        }

        @Override
        public VtonJobResponse submitJob(
                String personImageUrl, String garmentImageUrl, String category, String garmentDescription) {
            lastGarmentUrl = garmentImageUrl;
            return submitResponse;
        }

        @Override
        public VtonJobResponse pollJob(String jobId) {
            VtonJobResponse next = pollQueue.pollFirst();
            return next != null ? next : new VtonJobResponse();
        }
    }
}
