package com.jsystems.bestservice.ai;

import com.jsystems.bestservice.caseintake.CaseSubmissionCommand;
import com.jsystems.bestservice.decision.ResaleCondition;
import com.jsystems.bestservice.imageanalysis.ImageAnalysisResult;
import com.jsystems.bestservice.persistence.RequestType;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class FakeImageAnalysisAiClient implements ImageAnalysisAiClient {

    private static final String MODEL = "fake-vision-v1";
    private static final String PROMPT_VERSION = "image-analysis-v1";

    @Override
    public ImageAnalysisResult analyze(CaseSubmissionCommand command) {
        String filename = command.image().getOriginalFilename();
        String normalizedFilename = filename == null ? "" : filename.toLowerCase(Locale.ROOT);

        if (normalizedFilename.contains("unclear")) {
            return new ImageAnalysisResult(
                    false,
                    "Zdjęcie jest nieczytelne albo nie pokazuje stanu sprzętu.",
                    null,
                    null,
                    null,
                    null,
                    null,
                    ResaleCondition.UNCLEAR,
                    false,
                    "low",
                    "Nie można ocenić stanu sprzętu na podstawie zdjęcia.",
                    MODEL,
                    PROMPT_VERSION
            );
        }

        if (normalizedFilename.contains("use") || normalizedFilename.contains("wear")) {
            return evaluable(
                    null,
                    null,
                    "Widoczne ślady użycia produktu.",
                    null,
                    null,
                    ResaleCondition.NOT_RESELLABLE,
                    "Zdjęcie pokazuje ślady użycia."
            );
        }

        if (normalizedFilename.contains("damage") || normalizedFilename.contains("broken")) {
            return evaluable(
                    "Widoczne uszkodzenie mechaniczne.",
                    null,
                    null,
                    "Możliwy upadek lub nacisk.",
                    null,
                    ResaleCondition.NOT_RESELLABLE,
                    "Zdjęcie pokazuje widoczne uszkodzenie."
            );
        }

        if (command.requestType() == RequestType.COMPLAINT) {
            return evaluable(
                    null,
                    "Widoczne objawy usterki wskazane w zgłoszeniu.",
                    null,
                    "Objawy są zgodne z opisem klienta.",
                    null,
                    ResaleCondition.UNCLEAR,
                    "Zdjęcie wspiera opis usterki."
            );
        }

        return evaluable(
                null,
                null,
                null,
                null,
                null,
                ResaleCondition.APPEARS_RESELLABLE,
                "Produkt wygląda na nieuszkodzony i zdatny do ponownej sprzedaży."
        );
    }

    private ImageAnalysisResult evaluable(
            String visibleDamage,
            String visibleDefectIndicators,
            String visibleUsageSigns,
            String possibleCauseIndicators,
            String missingOrAlteredVisibleParts,
            ResaleCondition resaleCondition,
            String summaryPl
    ) {
        return new ImageAnalysisResult(
                true,
                null,
                visibleDamage,
                visibleDefectIndicators,
                visibleUsageSigns,
                possibleCauseIndicators,
                missingOrAlteredVisibleParts,
                resaleCondition,
                false,
                "high",
                summaryPl,
                MODEL,
                PROMPT_VERSION
        );
    }
}
