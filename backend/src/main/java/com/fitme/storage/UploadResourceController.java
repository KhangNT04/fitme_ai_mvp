package com.fitme.storage;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequiredArgsConstructor
public class UploadResourceController {

    private final StorageService storageService;

    @GetMapping("/uploads/**")
    public ResponseEntity<byte[]> serveUpload(HttpServletRequest request) throws IOException {
        String path = request.getRequestURI();
        try {
            StoredObject object = storageService.read(path);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .contentType(MediaType.parseMediaType(object.contentType()))
                    .body(object.bytes());
        } catch (IOException ex) {
            return ResponseEntity.notFound().build();
        }
    }
}
