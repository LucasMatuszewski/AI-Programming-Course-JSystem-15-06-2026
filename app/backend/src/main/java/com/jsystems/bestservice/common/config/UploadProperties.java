package com.jsystems.bestservice.common.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "best-service.upload")
public record UploadProperties(
        @NotBlank String root,
        @NotNull DataSize maxImageSize
) {
}
