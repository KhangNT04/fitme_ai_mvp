package com.fitme.tryon;

import com.fitme.AbstractIntegrationTest;
import com.fitme.ai.client.AiVtonClient;
import com.fitme.ai.client.AiVtonClient.VtonJobResponse;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ItemRole;
import com.fitme.preview.service.VtonTryOnService;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;

import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "fitme.ai.mode=hf",
        "fitme.ai.public-base-url=http://localhost:8080"
})
@Import(TryOnAsyncVtonIntegrationTest.StubConfig.class)
class TryOnAsyncVtonIntegrationTest extends AbstractIntegrationTest {

    private static final byte[] MINIMAL_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9
    };

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private VtonTryOnService vtonTryOnService;

    @BeforeEach
    void resetStub() {
        StubAiVtonClient.pollQueues.clear();
        StubAiVtonClient.lastResponses.clear();
        StubAiVtonClient.submitResponse = null;
    }

    @Test
    void avatarMode_hfMode_returnsProcessingThenCompletesAfterPoll() throws Exception {
        VtonJobResponse submit = new VtonJobResponse();
        submit.setJobId("job-avatar-1");
        submit.setStatus("processing");
        StubAiVtonClient.submitResponse = submit;

        VtonJobResponse completed = new VtonJobResponse();
        completed.setJobId("job-avatar-1");
        completed.setStatus("completed");
        completed.setOutputImageUrl("https://cdn.example/vton-avatar.jpg");

        StubAiVtonClient.enqueue("job-avatar-1", completed);

        Product product = testDataHelper.createEligibleProduct("HF avatar top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        String requestId = createTryOn(sessionToken, """
                {
                  "previewMode": "AVATAR",
                  "avatarKey": "avatar-female-1",
                  "heightCm": 165,
                  "weightKg": 55
                }
                """);
        addItem(sessionToken, requestId, product);

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .header("Authorization", "Bearer " + registerUserAccessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSING"));

        vtonTryOnService.pollForTryOn(UUID.fromString(requestId));

        mockMvc.perform(get("/api/v1/try-on/requests/{id}/result", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.previewImageUrl").value("https://cdn.example/vton-avatar.jpg"))
                .andExpect(jsonPath("$.data.previewSource").value("VTON"));
    }

    @Test
    void userPhotoMode_hfMode_returnsProcessingThenCompletesAfterPoll() throws Exception {
        VtonJobResponse submit = new VtonJobResponse();
        submit.setJobId("job-async-1");
        submit.setStatus("processing");
        StubAiVtonClient.submitResponse = submit;

        VtonJobResponse processing = new VtonJobResponse();
        processing.setJobId("job-async-1");
        processing.setStatus("processing");

        VtonJobResponse completed = new VtonJobResponse();
        completed.setJobId("job-async-1");
        completed.setStatus("completed");
        completed.setOutputImageUrl("https://cdn.example/vton-result.jpg");

        StubAiVtonClient.enqueue("job-async-1", processing);
        StubAiVtonClient.enqueue("job-async-1", completed);

        Product product = testDataHelper.createEligibleProduct("HF top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();
        String photoUploadId = uploadAndCheckPhoto(sessionToken);

        String requestId = createTryOn(sessionToken, """
                {
                  "previewMode": "USER_PHOTO",
                  "photoUploadId": "%s",
                  "heightCm": 165,
                  "weightKg": 55
                }
                """.formatted(photoUploadId));
        addItem(sessionToken, requestId, product);

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .header("Authorization", "Bearer " + registerUserAccessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSING"))
                .andExpect(jsonPath("$.data.previewImageUrl").doesNotExist());

        vtonTryOnService.pollForTryOn(UUID.fromString(requestId));
        vtonTryOnService.pollForTryOn(UUID.fromString(requestId));

        mockMvc.perform(get("/api/v1/try-on/requests/{id}/result", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.previewImageUrl").value("https://cdn.example/vton-result.jpg"));
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
        /**
         * Poll responses per job id, with the last answer kept as the fallback.
         *
         * <p>The background {@code TryOnJobPoller} polls every PROCESSING preview, so a
         * single shared queue would let another poller consume the "completed" response
         * meant for this test, leaving the try-on stuck in PROCESSING. Keying by job id
         * keeps each job's answers together, and repeating the last answer means the test
         * no longer depends on how many times a poller happened to run.
         */
        static final Map<String, Deque<VtonJobResponse>> pollQueues = new ConcurrentHashMap<>();
        static final Map<String, VtonJobResponse> lastResponses = new ConcurrentHashMap<>();

        static void enqueue(String jobId, VtonJobResponse response) {
            pollQueues.computeIfAbsent(jobId, key -> new ConcurrentLinkedDeque<>()).add(response);
            lastResponses.put(jobId, response);
        }

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
            return submitResponse;
        }

        @Override
        public VtonJobResponse pollJob(String jobId) {
            Deque<VtonJobResponse> queue = pollQueues.get(jobId);
            VtonJobResponse next = queue != null ? queue.pollFirst() : null;
            if (next != null) {
                return next;
            }
            // The queue is empty: repeat the last answer so a second poll still completes.
            VtonJobResponse last = lastResponses.get(jobId);
            return last != null ? last : new VtonJobResponse();
        }
    }

    private String uploadAndCheckPhoto(String sessionToken) throws Exception {
        String consentResponse = mockMvc.perform(post("/api/v1/uploads/user-photo/consent")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String consentId = objectMapper.readTree(consentResponse).get("data").get("id").asText();

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", MINIMAL_JPEG);

        String uploadResponse = mockMvc.perform(multipart("/api/v1/uploads/user-photo")
                        .file(file)
                        .param("consentId", consentId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String uploadId = objectMapper.readTree(uploadResponse).get("data").get("id").asText();

        mockMvc.perform(get("/api/v1/uploads/user-photo/{id}/quality", uploadId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        return uploadId;
    }

    private String createTryOn(String sessionToken, String body) throws Exception {
        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(createResponse).get("data").get("id").asText();
    }

    private void addItem(String sessionToken, String requestId, Product product) throws Exception {
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": "%s",
                                  "role": "%s",
                                  "selectedSize": "M"
                                }
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());
    }
}
