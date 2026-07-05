package com.fitme.storage;

import com.fitme.common.config.FitMeProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Paths;

@Service
@ConditionalOnProperty(name = "fitme.storage.mode", havingValue = "r2")
@RequiredArgsConstructor
public class R2StorageService implements StorageService {

    private final FitMeProperties properties;

    @Override
    public String store(String folder, String filename, MultipartFile file) throws IOException {
        ImageUploadValidator.validate(file);
        FitMeProperties.Storage.R2 r2 = properties.getStorage().getR2();
        validateConfig(r2);

        String safeName = MediaPaths.sanitizeFilename(
                filename != null && !filename.isBlank() ? filename : file.getOriginalFilename());
        if (!safeName.contains(".") && file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")) {
            safeName = safeName + file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.'));
        } else if (!safeName.contains(".")) {
            safeName = safeName + defaultExtension(file.getContentType());
        }

        String objectKey = folder + "/" + safeName;
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        try (S3Client client = buildClient(r2)) {
            client.putObject(
                    PutObjectRequest.builder()
                            .bucket(r2.getBucket())
                            .key(objectKey)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        }

        return buildPublicUrl(r2.getPublicBaseUrl(), objectKey);
    }

    @Override
    public void delete(String path) throws IOException {
        if (path == null || path.isBlank()) {
            return;
        }
        FitMeProperties.Storage.R2 r2 = properties.getStorage().getR2();
        if (r2.getBucket() == null || r2.getBucket().isBlank()) {
            return;
        }
        String objectKey = extractObjectKey(path, r2.getPublicBaseUrl());
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        try (S3Client client = buildClient(r2)) {
            client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(r2.getBucket())
                    .key(objectKey)
                    .build());
        }
    }

    private static S3Client buildClient(FitMeProperties.Storage.R2 r2) {
        return S3Client.builder()
                .endpointOverride(URI.create(r2.getEndpoint()))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(r2.getAccessKeyId(), r2.getSecretAccessKey())))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    private static void validateConfig(FitMeProperties.Storage.R2 r2) {
        if (r2.getEndpoint() == null || r2.getEndpoint().isBlank()
                || r2.getBucket() == null || r2.getBucket().isBlank()
                || r2.getAccessKeyId() == null || r2.getAccessKeyId().isBlank()
                || r2.getSecretAccessKey() == null || r2.getSecretAccessKey().isBlank()
                || r2.getPublicBaseUrl() == null || r2.getPublicBaseUrl().isBlank()) {
            throw new IllegalStateException("R2 storage is not fully configured");
        }
    }

    static String buildPublicUrl(String publicBaseUrl, String objectKey) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + objectKey;
    }

    static String extractObjectKey(String storedPathOrUrl, String publicBaseUrl) {
        String value = storedPathOrUrl.trim();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
                String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
                if (value.startsWith(base + "/")) {
                    return value.substring(base.length() + 1);
                }
            }
            return Paths.get(URI.create(value).getPath()).toString().substring(1);
        }
        if (value.startsWith("/uploads/")) {
            return value.substring("/uploads/".length());
        }
        return value.startsWith("/") ? value.substring(1) : value;
    }

    private static String defaultExtension(String contentType) {
        if (contentType == null) {
            return ".jpg";
        }
        return switch (contentType.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
