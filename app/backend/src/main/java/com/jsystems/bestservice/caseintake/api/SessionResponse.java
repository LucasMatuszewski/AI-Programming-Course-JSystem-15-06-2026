package com.jsystems.bestservice.caseintake.api;

import java.util.List;
import java.util.UUID;

public record SessionResponse(
        UUID sessionId,
        String requestType,
        String status,
        String terminalState,
        int imageAttemptCount,
        int remainingImageAttempts,
        DecisionResponse latestDecision,
        ImageRetryResponse imageRetry,
        List<ChatMessageResponse> messages
) {
}
