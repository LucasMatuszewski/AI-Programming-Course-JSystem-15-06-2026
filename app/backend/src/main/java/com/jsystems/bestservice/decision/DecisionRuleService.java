package com.jsystems.bestservice.decision;

import com.jsystems.bestservice.persistence.DecisionStatus;
import com.jsystems.bestservice.persistence.RejectionType;
import com.jsystems.bestservice.persistence.RequestType;
import com.jsystems.bestservice.persistence.TerminalState;
import org.springframework.stereotype.Component;

@Component
public class DecisionRuleService {

    public DecisionResult decideInitial(DecisionInput input, ImageObservations observations) {
        if (!observations.evaluable() && observations.attemptNumber() >= 3) {
            return humanVerification(
                    TerminalState.IN_PERSON_VERIFICATION_REQUIRED,
                    "image.in_person_verification_after_three_attempts",
                    "Zdjęcie nadal nie pozwala ocenić sprawy po trzech próbach.",
                    "Zgłoś się z produktem do serwisu stacjonarnego; w serwisie stacjonarnym pracownik zweryfikuje sprzęt na miejscu."
            );
        }

        if (observations.contradictionWithForm()) {
            return humanVerification(
                    TerminalState.HUMAN_VERIFICATION_REQUIRED,
                    "%s.form_image_contradiction".formatted(rulePrefix(input)),
                    "Opis sprawy i zdjęcie są ze sobą sprzeczne.",
                    "Przekazujemy sprawę do weryfikacji przez pracownika."
            );
        }

        if (input.requestType() == RequestType.COMPLAINT) {
            return decideComplaint(input, observations);
        }

        return decideReturn(input, observations);
    }

    private DecisionResult decideComplaint(DecisionInput input, ImageObservations observations) {
        if (observations.mechanicalDamage()) {
            return rejected(
                    RejectionType.MECHANICAL_DAMAGE_DETECTED,
                    "complaint.mechanical_damage_detected",
                    "Zdjęcie wskazuje na uszkodzenie mechaniczne.",
                    "Na zdjęciu widać ślady uszkodzenia mechanicznego, więc reklamacja nie może zostać zaakceptowana automatycznie.",
                    "Możesz opisać dodatkowe okoliczności w czacie albo przekazać sprawę do weryfikacji pracownika."
            );
        }

        if (observations.usageOrWearOnly()) {
            return rejected(
                    RejectionType.USAGE_OR_WEAR,
                    "complaint.usage_or_wear",
                    "Widoczne są wyłącznie ślady zwykłego użycia.",
                    "Zgłoszony problem wygląda na normalne zużycie lub kosmetyczne ślady używania sprzętu.",
                    "Jeśli uważasz, że sprzęt ma inną usterkę, opisz ją dokładniej i dodaj zdjęcie pokazujące problem."
            );
        }

        if (input.hasReason() && complaintEvidenceSupported(observations)) {
            return approved(
                    "complaint.visible_defect_supported",
                    "reklamacja została zaakceptowana, ponieważ opis i zdjęcie pokazują widoczne objawy usterki sprzętu.",
                    "Przygotuj sprzęt do dalszej obsługi serwisowej. W czacie możesz doprecyzować objawy."
            );
        }

        return rejected(
                RejectionType.INSUFFICIENT_EVIDENCE,
                "complaint.insufficient_evidence",
                "Brak wystarczających dowodów usterki.",
                "Na podstawie opisu i zdjęcia nie można potwierdzić wady ani warunku istotnego dla reklamacji.",
                "Dodaj w czacie konkretne objawy albo prześlij zdjęcie, które pokazuje usterkę."
        );
    }

    private DecisionResult decideReturn(DecisionInput input, ImageObservations observations) {
        if (observations.visibleDamage() || observations.mechanicalDamage()) {
            return rejected(
                    RejectionType.VISIBLE_DAMAGE,
                    "return.visible_damage",
                    "Zdjęcie pokazuje widoczne uszkodzenie.",
                    "Zwrot nie może zostać zaakceptowany, ponieważ na zdjęciu widać uszkodzenie sprzętu.",
                    "Możesz wyjaśnić sytuację w czacie, a nierozstrzygnięte przypadki trafią do pracownika."
            );
        }

        if (observations.visibleUsageSigns() || observations.usageOrWearOnly()) {
            return rejected(
                    RejectionType.SIGNS_OF_USE,
                    "return.signs_of_use",
                    "Widoczne są ślady użycia produktu.",
                    "Produkt nosi ślady użycia wykraczające poza podstawowe sprawdzenie, więc zwrot nie może zostać zaakceptowany automatycznie.",
                    "Jeśli ślady wynikają z transportu lub pomyłki, opisz to w czacie."
            );
        }

        if (
                observations.missingOrAlteredVisibleParts()
                        || observations.resaleCondition() == ResaleCondition.NOT_RESELLABLE
        ) {
            return rejected(
                    RejectionType.NOT_RESELLABLE,
                    "return.not_resellable",
                    "Produkt nie wygląda na możliwy do ponownej sprzedaży.",
                    "Zdjęcie wskazuje, że produkt ma braki, zmienione elementy albo stan uniemożliwiający ponowną sprzedaż.",
                    "Sprawdź kompletność zestawu i opisz brakujące elementy w czacie."
            );
        }

        if (
                input.purchaseDate() != null
                        && observations.resaleCondition() == ResaleCondition.APPEARS_RESELLABLE
        ) {
            return approved(
                    "return.resellable_condition_supported",
                    "zwrot został zaakceptowany, ponieważ zdjęcie nie pokazuje uszkodzeń ani śladów użycia, a produkt wygląda na zdatny do ponownej sprzedaży.",
                    "Przygotuj kompletny produkt do dalszej obsługi zwrotu."
            );
        }

        return rejected(
                RejectionType.INSUFFICIENT_EVIDENCE,
                "return.insufficient_evidence",
                "Brak wystarczających dowodów stanu do zwrotu.",
                "Zdjęcie nie pozwala potwierdzić, że produkt jest nieużywany, kompletny i zdatny do ponownej sprzedaży.",
                "Prześlij zdjęcie pokazujące stan sprzętu i kompletność zestawu."
        );
    }

    private boolean complaintEvidenceSupported(ImageObservations observations) {
        return observations.visibleDefectIndicators()
                || observations.visibleDamage()
                || observations.serviceRelevantCondition();
    }

    private DecisionResult approved(String ruleCategory, String justificationPl, String nextStepsPl) {
        return new DecisionResult(
                DecisionStatus.APPROVED,
                null,
                null,
                justificationPl,
                nextStepsPl,
                ruleCategory,
                TerminalState.APPROVED
        );
    }

    private DecisionResult rejected(
            RejectionType rejectionType,
            String ruleCategory,
            String rejectionReasonPl,
            String justificationPl,
            String nextStepsPl
    ) {
        return new DecisionResult(
                DecisionStatus.REJECTED,
                rejectionType,
                rejectionReasonPl,
                justificationPl,
                nextStepsPl,
                ruleCategory,
                TerminalState.REJECTED
        );
    }

    private DecisionResult humanVerification(
            TerminalState terminalState,
            String ruleCategory,
            String justificationPl,
            String nextStepsPl
    ) {
        return new DecisionResult(
                DecisionStatus.HUMAN_VERIFICATION_REQUIRED,
                null,
                null,
                justificationPl,
                nextStepsPl,
                ruleCategory,
                terminalState
        );
    }

    private String rulePrefix(DecisionInput input) {
        return input.requestType() == RequestType.COMPLAINT ? "complaint" : "return";
    }
}
