package com.jsystems.bestservice.decision;

import com.jsystems.bestservice.persistence.RequestType;

import java.time.LocalDate;

public record DecisionInput(
        RequestType requestType,
        LocalDate purchaseDate,
        String reason
) {
    public boolean hasReason() {
        return reason != null && !reason.isBlank();
    }
}
