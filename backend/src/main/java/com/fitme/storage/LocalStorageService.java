package com.fitme.storage;

import com.fitme.common.config.FitMeProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocalStorageService implements StorageService {

    private final FitMeProperties properties;

    @Override
    public String store(String folder, String filename, MultipartFile file) throws IOException {
        Path baseDir = Paths.get(properties.getUpload().getDir()).toAbsolutePath().normalize();
        Path targetDir = baseDir.resolve(folder);
        Files.createDirectories(targetDir);
        String safeName = filename != null && !filename.isBlank() ? filename : UUID.randomUUID() + getExtension(file);
        Path target = targetDir.resolve(safeName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/" + folder + "/" + safeName;
    }

    @Override
    public void delete(String path) throws IOException {
        if (path == null || path.isBlank()) {
            return;
        }
        String relative = path.startsWith("/uploads/") ? path.substring("/uploads/".length()) : path;
        Path filePath = Paths.get(properties.getUpload().getDir()).resolve(relative).normalize();
        Files.deleteIfExists(filePath);
    }

    private String getExtension(MultipartFile file) {
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            return original.substring(original.lastIndexOf('.'));
        }
        return "";
    }
}
