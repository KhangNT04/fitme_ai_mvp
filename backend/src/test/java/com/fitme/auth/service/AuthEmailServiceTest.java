package com.fitme.auth.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.sun.net.httpserver.HttpServer;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Local delivery checks: GreenMail (SMTP) + embedded HTTP (Resend API).
 */
class AuthEmailServiceTest {

    private GreenMail greenMail;
    private AuthEmailService authEmailService;
    private HttpServer resendServer;

    @BeforeEach
    void setUp() {
        greenMail = new GreenMail(ServerSetupTest.SMTP);
        greenMail.start();

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("127.0.0.1");
        sender.setPort(ServerSetupTest.SMTP.getPort());
        Properties props = new Properties();
        props.put("mail.smtp.auth", "false");
        props.put("mail.smtp.starttls.enable", "false");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        sender.setJavaMailProperties(props);

        FitMeProperties fitMeProperties = new FitMeProperties();
        fitMeProperties.getAuth().setExposeVerificationCode(false);
        fitMeProperties.getAuth().setVerificationTtlSeconds(1800);
        fitMeProperties.getAuth().setMailFrom("FitMe AI <noreply@fitme.test>");
        fitMeProperties.getAuth().setResendApiKey("");

        authEmailService = new AuthEmailService(mailSenderProvider(sender), fitMeProperties);
        ReflectionTestUtils.setField(authEmailService, "mailHost", "127.0.0.1");
        ReflectionTestUtils.setField(authEmailService, "mailPassword", "");
        ReflectionTestUtils.setField(authEmailService, "resendApiBaseUrl", "https://api.resend.com");
    }

    @AfterEach
    void tearDown() {
        if (greenMail != null) {
            greenMail.stop();
        }
        if (resendServer != null) {
            resendServer.stop(0);
        }
    }

    @Test
    void sendVerificationCode_deliversMessageWithCode() throws Exception {
        authEmailService.sendVerificationCode("user@example.com", "654321");

        assertThat(greenMail.waitForIncomingEmail(5_000, 1)).isTrue();
        MimeMessage[] messages = greenMail.getReceivedMessages();
        assertThat(messages).hasSize(1);
        assertThat(messages[0].getSubject()).contains("FitMe");
        assertThat(GreenMailUtil.getBody(messages[0])).contains("654321");
        assertThat(GreenMailUtil.getAddressList(messages[0].getAllRecipients())).contains("user@example.com");
    }

    @Test
    void sendVerificationCode_viaResendHttp_postsToApi() throws Exception {
        AtomicReference<String> authHeader = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        resendServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        resendServer.createContext("/emails", exchange -> {
            authHeader.set(exchange.getRequestHeaders().getFirst("Authorization"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] resp = "{\"id\":\"email_test\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.close();
        });
        resendServer.start();

        FitMeProperties props = new FitMeProperties();
        props.getAuth().setExposeVerificationCode(false);
        props.getAuth().setVerificationTtlSeconds(1800);
        props.getAuth().setMailFrom("FitMe AI <onboarding@resend.dev>");
        props.getAuth().setResendApiKey("re_test_key");

        AuthEmailService svc = new AuthEmailService(emptyMailSender(), props);
        ReflectionTestUtils.setField(svc, "mailHost", "");
        ReflectionTestUtils.setField(svc, "mailPassword", "");
        ReflectionTestUtils.setField(
                svc, "resendApiBaseUrl", "http://127.0.0.1:" + resendServer.getAddress().getPort());

        svc.sendVerificationCode("user@example.com", "112233");

        assertThat(authHeader.get()).isEqualTo("Bearer re_test_key");
        assertThat(requestBody.get()).contains("112233");
        assertThat(requestBody.get()).contains("user@example.com");
        assertThat(requestBody.get()).contains("onboarding@resend.dev");
    }

    @Test
    void sendVerificationCode_withoutSmtp_andExposeOff_fails() {
        FitMeProperties props = new FitMeProperties();
        props.getAuth().setExposeVerificationCode(false);
        props.getAuth().setResendApiKey("");
        AuthEmailService bare = new AuthEmailService(emptyMailSender(), props);
        ReflectionTestUtils.setField(bare, "mailHost", "");
        ReflectionTestUtils.setField(bare, "mailPassword", "");

        assertThatThrownBy(() -> bare.sendVerificationCode("a@b.com", "111111"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("email");
    }

    private static ObjectProvider<JavaMailSender> mailSenderProvider(JavaMailSender sender) {
        return new ObjectProvider<>() {
            @Override
            public JavaMailSender getObject() {
                return sender;
            }

            @Override
            public JavaMailSender getObject(Object... args) {
                return sender;
            }

            @Override
            public JavaMailSender getIfAvailable() {
                return sender;
            }

            @Override
            public JavaMailSender getIfUnique() {
                return sender;
            }
        };
    }

    private static ObjectProvider<JavaMailSender> emptyMailSender() {
        return new ObjectProvider<>() {
            @Override
            public JavaMailSender getObject() {
                return null;
            }

            @Override
            public JavaMailSender getObject(Object... args) {
                return null;
            }

            @Override
            public JavaMailSender getIfAvailable() {
                return null;
            }

            @Override
            public JavaMailSender getIfUnique() {
                return null;
            }
        };
    }
}
