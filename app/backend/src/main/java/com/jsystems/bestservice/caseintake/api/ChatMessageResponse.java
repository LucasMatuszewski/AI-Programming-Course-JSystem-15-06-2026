package com.jsystems.bestservice.caseintake.api;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID messageId,
        String role,
        String contentPl,
        int sequenceNumber,
        String messageType,
        Instant createdAt
) {
}
