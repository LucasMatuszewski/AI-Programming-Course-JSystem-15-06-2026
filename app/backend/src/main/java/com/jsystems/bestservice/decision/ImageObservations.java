package com.jsystems.bestservice.decision;

public record ImageObservations(
        boolean evaluable,
        int attemptNumber,
        boolean visibleDamage,
        boolean visibleDefectIndicators,
        boolean visibleUsageSigns,
        boolean usageOrWearOnly,
        boolean mechanicalDamage,
        boolean serviceRelevantCondition,
        boolean missingOrAlteredVisibleParts,
        ResaleCondition resaleCondition,
        boolean contradictionWithForm
) {
    public static ImageObservations initialEvaluable() {
        return new ImageObservations(
                true,
                1,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                ResaleCondition.UNCLEAR,
                false
        );
    }

    public ImageObservations withEvaluable(boolean value) {
        return new ImageObservations(
                value,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withAttemptNumber(int value) {
        return new ImageObservations(
                evaluable,
                value,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withVisibleDamage(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                value,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withVisibleDefectIndicators(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                value,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withVisibleUsageSigns(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                value,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withUsageOrWearOnly(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                value,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withMechanicalDamage(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                value,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withMissingOrAlteredVisibleParts(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                value,
                resaleCondition,
                contradictionWithForm
        );
    }

    public ImageObservations withResaleCondition(ResaleCondition value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                value,
                contradictionWithForm
        );
    }

    public ImageObservations withContradictionWithForm(boolean value) {
        return new ImageObservations(
                evaluable,
                attemptNumber,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                usageOrWearOnly,
                mechanicalDamage,
                serviceRelevantCondition,
                missingOrAlteredVisibleParts,
                resaleCondition,
                value
        );
    }
}
