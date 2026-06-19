package com.jsystems.bestservice.storage;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ImageStorageService {

    StoredImageFile store(UUID sessionId, int attemptNumber, MultipartFile image);

    void delete(String relativePath);
}
