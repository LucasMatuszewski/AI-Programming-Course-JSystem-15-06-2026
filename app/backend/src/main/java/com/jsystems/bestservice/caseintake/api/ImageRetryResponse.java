package com.jsystems.bestservice.caseintake.api;

public record ImageRetryResponse(
        String reasonPl,
        int remainingAttempts
) {
}
