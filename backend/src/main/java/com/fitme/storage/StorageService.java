package com.fitme.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface StorageService {

    String store(String folder, String filename, MultipartFile file) throws IOException;

    void delete(String path) throws IOException;

    StoredObject read(String path) throws IOException;
}
