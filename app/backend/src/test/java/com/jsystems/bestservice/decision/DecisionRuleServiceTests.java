package com.jsystems.bestservice.decision;

import com.jsystems.bestservice.persistence.DecisionStatus;
import com.jsystems.bestservice.persistence.RejectionType;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.TerminalState;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DecisionRuleServiceTests {

    private final DecisionRuleService decisionRuleService = new DecisionRuleService();

    @Test
    void complaintApprovedWithReasonAndImageSupportedDefect() {
        DecisionResult result = decisionRuleService.decideInitial(
                complaint("Matryca miga po uruchomieniu."),
                observations().withVisibleDefectIndicators(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.APPROVED);
        assertThat(result.rejectionType()).isNull();
        assertThat(result.ruleCategory()).isEqualTo("complaint.visible_defect_supported");
        assertThat(result.justificationPl()).contains("reklamacja", "widoczne");
        assertThat(result.nextStepsPl()).isNotBlank();
    }

    @Test
    void complaintRejectedAsInsufficientEvidence() {
        DecisionResult result = decisionRuleService.decideInitial(
                complaint("Nie działa dobrze."),
                observations()
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.INSUFFICIENT_EVIDENCE);
        assertThat(result.ruleCategory()).isEqualTo("complaint.insufficient_evidence");
        assertThat(result.rejectionReasonPl()).contains("Brak wystarczających dowodów");
    }

    @Test
    void complaintRejectedAsMechanicalDamageDetected() {
        DecisionResult result = decisionRuleService.decideInitial(
                complaint("Ekran pękł podczas normalnego użycia."),
                observations().withMechanicalDamage(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.MECHANICAL_DAMAGE_DETECTED);
        assertThat(result.ruleCategory()).isEqualTo("complaint.mechanical_damage_detected");
    }

    @Test
    void complaintRejectedAsUsageOrWear() {
        DecisionResult result = decisionRuleService.decideInitial(
                complaint("Obudowa wygląda gorzej po kilku tygodniach."),
                observations().withUsageOrWearOnly(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.USAGE_OR_WEAR);
        assertThat(result.ruleCategory()).isEqualTo("complaint.usage_or_wear");
    }

    @Test
    void complaintRoutedToHumanVerificationWhenImageAndFormContradict() {
        DecisionResult result = decisionRuleService.decideInitial(
                complaint("Produkt nie ma uszkodzeń mechanicznych."),
                observations().withMechanicalDamage(true).withContradictionWithForm(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.HUMAN_VERIFICATION_REQUIRED);
        assertThat(result.terminalState()).isEqualTo(TerminalState.HUMAN_VERIFICATION_REQUIRED);
        assertThat(result.ruleCategory()).isEqualTo("complaint.form_image_contradiction");
    }

    @Test
    void returnApprovedWhenUnusedUndamagedAndResellable() {
        DecisionResult result = decisionRuleService.decideInitial(
                returnRequest(),
                observations().withResaleCondition(ResaleCondition.APPEARS_RESELLABLE)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.APPROVED);
        assertThat(result.rejectionType()).isNull();
        assertThat(result.ruleCategory()).isEqualTo("return.resellable_condition_supported");
    }

    @Test
    void returnRejectedAsVisibleDamage() {
        DecisionResult result = decisionRuleService.decideInitial(
                returnRequest(),
                observations().withVisibleDamage(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.VISIBLE_DAMAGE);
        assertThat(result.ruleCategory()).isEqualTo("return.visible_damage");
    }

    @Test
    void returnRejectedAsSignsOfUse() {
        DecisionResult result = decisionRuleService.decideInitial(
                returnRequest(),
                observations().withVisibleUsageSigns(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.SIGNS_OF_USE);
        assertThat(result.ruleCategory()).isEqualTo("return.signs_of_use");
    }

    @Test
    void returnRejectedAsNotResellable() {
        DecisionResult result = decisionRuleService.decideInitial(
                returnRequest(),
                observations().withMissingOrAlteredVisibleParts(true)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.NOT_RESELLABLE);
        assertThat(result.ruleCategory()).isEqualTo("return.not_resellable");
    }

    @Test
    void unclearReturnEvidenceDoesNotApprove() {
        DecisionResult result = decisionRuleService.decideInitial(
                returnRequest(),
                observations().withResaleCondition(ResaleCondition.UNCLEAR)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.REJECTED);
        assertThat(result.rejectionType()).isEqualTo(RejectionType.INSUFFICIENT_EVIDENCE);
        assertThat(result.ruleCategory()).isEqualTo("return.insufficient_evidence");
    }

    @Test
    void thirdFailedImageAttemptRoutesToInPersonVerification() {
        DecisionResult result = decisionRuleService.decideInitial(
                returnRequest(),
                observations().withEvaluable(false).withAttemptNumber(3)
        );

        assertThat(result.status()).isEqualTo(DecisionStatus.HUMAN_VERIFICATION_REQUIRED);
        assertThat(result.terminalState()).isEqualTo(TerminalState.IN_PERSON_VERIFICATION_REQUIRED);
        assertThat(result.ruleCategory()).isEqualTo("image.in_person_verification_after_three_attempts");
        assertThat(result.nextStepsPl()).contains("serwisie stacjonarnym");
    }

    private static DecisionInput complaint(String reason) {
        return new DecisionInput(
                RequestType.COMPLAINT,
                LocalDate.of(2026, 6, 1),
                reason
        );
    }

    private static DecisionInput returnRequest() {
        return new DecisionInput(
                RequestType.RETURN,
                LocalDate.of(2026, 6, 1),
                ""
        );
    }

    private static ImageObservations observations() {
        return ImageObservations.initialEvaluable();
    }
}
