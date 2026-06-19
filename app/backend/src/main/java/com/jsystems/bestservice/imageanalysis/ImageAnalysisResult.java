package com.jsystems.bestservice.imageanalysis;

import com.jsystems.bestservice.decision.ResaleCondition;

public record ImageAnalysisResult(
        boolean isEvaluable,
        String notEvaluableReasonPl,
        String visibleDamage,
        String visibleDefectIndicators,
        String visibleUsageSigns,
        String possibleCauseIndicators,
        String missingOrAlteredVisibleParts,
        ResaleCondition resaleCondition,
        boolean contradictionWithForm,
        String confidence,
        String summaryPl,
        String model,
        String promptVersion
) {
}
