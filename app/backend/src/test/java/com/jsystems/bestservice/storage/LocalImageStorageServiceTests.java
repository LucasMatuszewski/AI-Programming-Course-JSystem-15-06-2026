package com.jsystems.bestservice.storage;

import com.jsystems.bestservice.common.config.UploadProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LocalImageStorageServiceTests {

    @Test
    void dangerousFilenameCannotAffectStoragePath() throws Exception {
        Path uploadRoot = Files.createTempDirectory(Path.of("target"), "uploads-test-");
        try {
            LocalImageStorageService storageService = new LocalImageStorageService(
                    new UploadProperties(uploadRoot.toString(), DataSize.ofMegabytes(8))
            );
            UUID sessionId = UUID.fromString("33333333-3333-3333-3333-333333333333");
            MockMultipartFile image = new MockMultipartFile(
                    "image",
                    "..\\..\\sekret/produkt.png",
                    "image/png",
                    "png".getBytes(StandardCharsets.UTF_8)
            );

            StoredImageFile storedImage = storageService.store(sessionId, 1, image);

            assertThat(storedImage.originalFilename()).isEqualTo("produkt.png");
            assertThat(storedImage.relativePath()).doesNotContain("..", "\\");
            assertThat(storedImage.relativePath()).contains(sessionId.toString());
            assertThat(storedImage.relativePath()).endsWith(".png");
            assertThat(Files.exists(uploadRoot.resolve(storedImage.relativePath()))).isTrue();
        } finally {
            deleteBestEffort(uploadRoot);
        }
    }

    private static void deleteBestEffort(Path root) {
        try (var paths = Files.walk(root)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Windows can keep short-lived file handles during test shutdown.
                }
            });
        } catch (IOException ignored) {
            // Best-effort cleanup only.
        }
    }
}
