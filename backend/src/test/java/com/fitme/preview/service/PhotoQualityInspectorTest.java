package com.fitme.preview.service;

import com.fitme.common.enums.PhotoQualityStatus;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class PhotoQualityInspectorTest {

    private final PhotoQualityInspector inspector = new PhotoQualityInspector();

    @Test
    void acceptsPortraitPhotoWithNormalExposure() throws IOException {
        assertThat(inspector.inspect(png(600, 900, new Color(120, 110, 100))).status()).isEqualTo(PhotoQualityStatus.GOOD);
    }

    @Test
    void rejectsTinyPhoto() throws IOException {
        PhotoQualityInspector.Result result = inspector.inspect(png(200, 300, Color.GRAY));
        assertThat(result.status()).isEqualTo(PhotoQualityStatus.LOW_QUALITY);
        assertThat(result.message()).contains("200×300");
    }

    @Test
    void rejectsLandscapePhoto() throws IOException {
        assertThat(inspector.inspect(png(1200, 600, Color.GRAY)).status()).isEqualTo(PhotoQualityStatus.LOW_QUALITY);
    }

    @Test
    void rejectsVeryDarkOrBlownOutPhoto() throws IOException {
        assertThat(inspector.inspect(png(600, 900, new Color(5, 5, 5))).status()).isEqualTo(PhotoQualityStatus.LOW_QUALITY);
        assertThat(inspector.inspect(png(600, 900, new Color(252, 252, 252))).status()).isEqualTo(PhotoQualityStatus.LOW_QUALITY);
    }

    @Test
    void acceptsBytesItCannotDecode() {
        assertThat(inspector.inspect(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9}).status())
                .isEqualTo(PhotoQualityStatus.GOOD);
    }

    private static byte[] png(int width, int height, Color fill) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(fill);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
