package com.jsystems.bestservice.common.config;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@ConfigurationProperties(prefix = "best-service.cors")
public record CorsProperties(
        @NotEmpty List<String> allowedOrigins
) {
}
