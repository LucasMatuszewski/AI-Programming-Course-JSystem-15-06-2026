package com.jsystems.bestservice.caseintake.api;

public record DecisionResponse(
        String status,
        String rejectionType,
        String rejectionReasonPl,
        String justificationPl,
        String nextStepsPl,
        String ruleCategory,
        int version
) {
}
