package com.fitme.preview.service;

import com.fitme.common.enums.PhotoQualityStatus;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Iterator;

/**
 * Cheap checks that catch photos the try-on model cannot use. Formats ImageIO cannot decode (WEBP)
 * are accepted unchecked rather than rejected.
 */
@Component
public class PhotoQualityInspector {

    static final int MIN_SHORT_SIDE_PX = 400;
    private static final double MAX_LANDSCAPE_RATIO = 1.2;
    private static final double MIN_MEAN_LUMINANCE = 25;
    private static final double MAX_MEAN_LUMINANCE = 240;
    private static final int SAMPLE_TARGET_PX = 128;

    public record Result(PhotoQualityStatus status, String message) {
        static Result good() {
            return new Result(PhotoQualityStatus.GOOD, null);
        }

        static Result low(String message) {
            return new Result(PhotoQualityStatus.LOW_QUALITY, message);
        }
    }

    public Result inspect(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) return Result.good();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) return Result.good();
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (Math.min(width, height) < MIN_SHORT_SIDE_PX) {
                    return Result.low("Ảnh quá nhỏ (%d×%d px). Cần cạnh ngắn tối thiểu %d px."
                            .formatted(width, height, MIN_SHORT_SIDE_PX));
                }
                if (width > height * MAX_LANDSCAPE_RATIO) {
                    return Result.low("Ảnh đang nằm ngang. Hãy dùng ảnh dọc chụp toàn thân.");
                }
                ImageReadParam param = reader.getDefaultReadParam();
                int step = Math.max(1, Math.max(width, height) / SAMPLE_TARGET_PX);
                param.setSourceSubsampling(step, step, 0, 0);
                double luminance = meanLuminance(reader.read(0, param));
                if (luminance < MIN_MEAN_LUMINANCE) {
                    return Result.low("Ảnh quá tối. Hãy chụp ở nơi đủ sáng.");
                }
                if (luminance > MAX_MEAN_LUMINANCE) {
                    return Result.low("Ảnh bị cháy sáng. Hãy tránh ngược sáng hoặc đèn quá gắt.");
                }
                return Result.good();
            } finally {
                reader.dispose();
            }
        } catch (Exception ex) {
            return Result.good();
        }
    }

    private static double meanLuminance(BufferedImage image) {
        long total = 0;
        int count = 0;
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                int rgb = image.getRGB(x, y);
                int r = (rgb >> 16) & 0xff;
                int g = (rgb >> 8) & 0xff;
                int b = rgb & 0xff;
                total += (299L * r + 587L * g + 114L * b) / 1000;
                count++;
            }
        }
        return count == 0 ? 128 : (double) total / count;
    }
}
