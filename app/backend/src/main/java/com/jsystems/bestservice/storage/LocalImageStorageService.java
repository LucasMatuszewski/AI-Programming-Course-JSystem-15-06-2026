package com.jsystems.bestservice.storage;

import com.jsystems.bestservice.common.api.ApiErrorCode;
import com.jsystems.bestservice.common.api.ApiException;
import com.jsystems.bestservice.common.config.UploadProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalImageStorageService implements ImageStorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalImageStorageService.class);
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final Path uploadRoot;
    private final UploadProperties uploadProperties;

    public LocalImageStorageService(UploadProperties uploadProperties) {
        this.uploadProperties = uploadProperties;
        this.uploadRoot = Path.of(uploadProperties.root()).toAbsolutePath().normalize();
    }

    @Override
    public StoredImageFile store(UUID sessionId, int attemptNumber, MultipartFile image) {
        validate(image);
        String contentType = image.getContentType().toLowerCase(Locale.ROOT);
        String originalFilename = sanitizeOriginalFilename(image.getOriginalFilename());
        String extension = extensionFor(contentType);
        String relativePath = generatedRelativePath(sessionId, attemptNumber, extension);
        Path target = resolveRelativePath(relativePath);

        try {
            Files.createDirectories(target.getParent());
            try (InputStream inputStream = image.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new UncheckedIOException("Could not store uploaded image", exception);
        }

        return new StoredImageFile(originalFilename, contentType, image.getSize(), relativePath);
    }

    @Override
    public void delete(String relativePath) {
        try {
            Files.deleteIfExists(resolveRelativePath(relativePath));
        } catch (RuntimeException | IOException exception) {
            logger.warn("Could not delete uploaded image {}", relativePath, exception);
        }
    }

    private void validate(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ApiException(
                    ApiErrorCode.VALIDATION_FAILED,
                    HttpStatus.BAD_REQUEST,
                    "Popraw bledy w formularzu.",
                    Map.of("image", "Dodaj jedno zdjecie produktu.")
            );
        }
        if (image.getSize() > uploadProperties.maxImageSize().toBytes()) {
            throw new ApiException(
                    ApiErrorCode.IMAGE_TOO_LARGE,
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Plik jest za duzy. Maksymalny rozmiar zdjecia to "
                            + uploadProperties.maxImageSize().toMegabytes()
                            + " MB."
            );
        }
        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ApiException(
                    ApiErrorCode.UNSUPPORTED_IMAGE_TYPE,
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Dozwolone sa tylko pliki JPG, PNG albo WebP."
            );
        }
    }

    private String sanitizeOriginalFilename(String originalFilename) {
        String filename = StringUtils.hasText(originalFilename) ? originalFilename : "upload";
        String normalized = filename.replace('\\', '/');
        int lastSeparator = normalized.lastIndexOf('/');
        if (lastSeparator >= 0) {
            normalized = normalized.substring(lastSeparator + 1);
        }
        if (!StringUtils.hasText(normalized) || ".".equals(normalized) || "..".equals(normalized)) {
            return "upload";
        }
        return normalized;
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
        };
    }

    private String generatedRelativePath(UUID sessionId, int attemptNumber, String extension) {
        LocalDate today = LocalDate.now();
        return "%04d/%02d/%02d/%s/%d-%s.%s".formatted(
                today.getYear(),
                today.getMonthValue(),
                today.getDayOfMonth(),
                sessionId,
                attemptNumber,
                UUID.randomUUID(),
                extension
        );
    }

    private Path resolveRelativePath(String relativePath) {
        Path resolved = uploadRoot.resolve(relativePath).normalize();
        if (!resolved.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Image path escapes upload root");
        }
        return resolved;
    }
}
