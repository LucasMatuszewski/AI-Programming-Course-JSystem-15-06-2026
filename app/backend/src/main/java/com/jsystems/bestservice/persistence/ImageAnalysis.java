package com.jsystems.bestservice.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "image_analyses")
public class ImageAnalysis {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_id", nullable = false, unique = true)
    private UploadedImage image;

    @Column(name = "visible_damage_pl", columnDefinition = "text")
    private String visibleDamagePl;

    @Column(name = "defect_indicators_pl", columnDefinition = "text")
    private String defectIndicatorsPl;

    @Column(name = "usage_signs_pl", columnDefinition = "text")
    private String usageSignsPl;

    @Column(name = "possible_cause_indicators_pl", columnDefinition = "text")
    private String possibleCauseIndicatorsPl;

    @Column(name = "missing_or_altered_parts_pl", columnDefinition = "text")
    private String missingOrAlteredPartsPl;

    @Column(name = "resale_condition_pl", columnDefinition = "text")
    private String resaleConditionPl;

    @Column(nullable = false)
    private boolean unclear;

    @Column(name = "summary_pl", nullable = false, columnDefinition = "text")
    private String summaryPl;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(name = "prompt_version", nullable = false, length = 100)
    private String promptVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ImageAnalysis() {
    }

    private ImageAnalysis(
            UploadedImage image,
            String visibleDamagePl,
            String defectIndicatorsPl,
            String usageSignsPl,
            String possibleCauseIndicatorsPl,
            String missingOrAlteredPartsPl,
            String resaleConditionPl,
            boolean unclear,
            String summaryPl,
            String model,
            String promptVersion
    ) {
        this.id = UUID.randomUUID();
        this.image = image;
        this.visibleDamagePl = visibleDamagePl;
        this.defectIndicatorsPl = defectIndicatorsPl;
        this.usageSignsPl = usageSignsPl;
        this.possibleCauseIndicatorsPl = possibleCauseIndicatorsPl;
        this.missingOrAlteredPartsPl = missingOrAlteredPartsPl;
        this.resaleConditionPl = resaleConditionPl;
        this.unclear = unclear;
        this.summaryPl = summaryPl;
        this.model = model;
        this.promptVersion = promptVersion;
        this.createdAt = Instant.now();
    }

    public static ImageAnalysis create(
            UploadedImage image,
            String visibleDamagePl,
            String defectIndicatorsPl,
            String usageSignsPl,
            String possibleCauseIndicatorsPl,
            String missingOrAlteredPartsPl,
            String resaleConditionPl,
            boolean unclear,
            String summaryPl,
            String model
    ) {
        return create(
                image,
                visibleDamagePl,
                defectIndicatorsPl,
                usageSignsPl,
                possibleCauseIndicatorsPl,
                missingOrAlteredPartsPl,
                resaleConditionPl,
                unclear,
                summaryPl,
                model,
                "unknown"
        );
    }

    public static ImageAnalysis create(
            UploadedImage image,
            String visibleDamagePl,
            String defectIndicatorsPl,
            String usageSignsPl,
            String possibleCauseIndicatorsPl,
            String missingOrAlteredPartsPl,
            String resaleConditionPl,
            boolean unclear,
            String summaryPl,
            String model,
            String promptVersion
    ) {
        ImageAnalysis analysis = new ImageAnalysis(
                image,
                visibleDamagePl,
                defectIndicatorsPl,
                usageSignsPl,
                possibleCauseIndicatorsPl,
                missingOrAlteredPartsPl,
                resaleConditionPl,
                unclear,
                summaryPl,
                model,
                promptVersion
        );
        image.attachAnalysis(analysis);
        return analysis;
    }

    public UUID getId() {
        return id;
    }

    public UploadedImage getImage() {
        return image;
    }

    public String getModel() {
        return model;
    }

    public String getPromptVersion() {
        return promptVersion;
    }
}
