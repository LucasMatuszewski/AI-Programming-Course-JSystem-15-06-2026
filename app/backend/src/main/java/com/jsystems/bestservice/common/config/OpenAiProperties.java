package com.jsystems.bestservice.common.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "best-service.openai")
public record OpenAiProperties(
        String apiKey,
        @NotBlank String textModel,
        @NotBlank String visionModel
) {
}
