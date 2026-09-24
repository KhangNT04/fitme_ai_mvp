package com.fitme.auth;

import com.fitme.AbstractIntegrationTest;
import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MvcResult;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Local/CI proof that register delivers a real SMTP message (GreenMail inbox),
 * without exposing the code in the API response.
 */
class AuthVerificationEmailDeliveryTest extends AbstractIntegrationTest {

    private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

    @RegisterExtension
    static final GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
            .withConfiguration(GreenMailConfiguration.aConfig().withDisabledAuthentication())
            .withPerMethodLifecycle(true);

    @DynamicPropertySource
    static void mailProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", () -> "127.0.0.1");
        registry.add("spring.mail.port", () -> ServerSetupTest.SMTP.getPort());
        registry.add("spring.mail.username", () -> "");
        registry.add("spring.mail.password", () -> "");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "false");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
        registry.add("fitme.auth.expose-verification-code", () -> "false");
        registry.add("fitme.auth.min-form-ms", () -> "0");
        registry.add("fitme.auth.mail-from", () -> "FitMe AI <noreply@fitme.test>");
    }

    @Test
    void register_sendsVerificationCodeByEmail() throws Exception {
        String email = "mail-test-" + java.util.UUID.randomUUID() + "@fitme.test";

        MvcResult captchaResult = mockMvc.perform(get("/api/v1/auth/captcha"))
                .andExpect(status().isOk())
                .andReturn();
        String captchaId = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.captchaId");
        String question = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.question");
        int answer = parseCaptchaAnswer(question);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test1234","fullName":"Mail Test","website":"","captchaId":"%s","captchaAnswer":"%d","formStartedAtMs":%d}
                                """.formatted(email, captchaId, answer, System.currentTimeMillis() - 5000)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requiresEmailVerification").value(true))
                .andExpect(jsonPath("$.data.verificationCode").doesNotExist());

        assertThat(greenMail.waitForIncomingEmail(10_000, 1)).isTrue();
        MimeMessage[] messages = greenMail.getReceivedMessages();
        assertThat(messages).hasSize(1);
        assertThat(messages[0].getAllRecipients()[0].toString()).contains(email);
        assertThat(messages[0].getSubject()).contains("FitMe");

        String body = GreenMailUtil.getBody(messages[0]);
        Matcher matcher = CODE.matcher(body);
        assertThat(matcher.find()).as("email body should contain 6-digit code").isTrue();
        String code = matcher.group(1);

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","token":"%s"}
                                """.formatted(email, code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailVerified").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }
}
