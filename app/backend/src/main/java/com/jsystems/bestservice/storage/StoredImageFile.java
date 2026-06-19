package com.jsystems.bestservice.storage;

public record StoredImageFile(
        String originalFilename,
        String contentType,
        long sizeBytes,
        String relativePath
) {
}
