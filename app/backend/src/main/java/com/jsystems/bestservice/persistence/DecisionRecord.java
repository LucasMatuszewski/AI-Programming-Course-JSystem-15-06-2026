package com.jsystems.bestservice.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "decision_records")
public class DecisionRecord {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ServiceSession session;

    @Column(nullable = false)
    private int version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private DecisionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejection_type", length = 64)
    private RejectionType rejectionType;

    @Column(name = "rejection_reason_pl", columnDefinition = "text")
    private String rejectionReasonPl;

    @Column(name = "justification_pl", nullable = false, columnDefinition = "text")
    private String justificationPl;

    @Column(name = "next_steps_pl", nullable = false, columnDefinition = "text")
    private String nextStepsPl;

    @Column(name = "rule_category", nullable = false, length = 100)
    private String ruleCategory;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(name = "prompt_version", nullable = false, length = 100)
    private String promptVersion;

    @Column(name = "previous_decision_id")
    private UUID previousDecisionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DecisionRecord() {
    }

    private DecisionRecord(
            ServiceSession session,
            int version,
            DecisionStatus status,
            RejectionType rejectionType,
            String rejectionReasonPl,
            String justificationPl,
            String nextStepsPl,
            String ruleCategory,
            UUID previousDecisionId,
            String model,
            String promptVersion
    ) {
        this.id = UUID.randomUUID();
        this.session = session;
        this.version = version;
        this.status = status;
        this.rejectionType = rejectionType;
        this.rejectionReasonPl = rejectionReasonPl;
        this.justificationPl = justificationPl;
        this.nextStepsPl = nextStepsPl;
        this.ruleCategory = ruleCategory;
        this.previousDecisionId = previousDecisionId;
        this.model = model;
        this.promptVersion = promptVersion;
        this.createdAt = Instant.now();
    }

    public static DecisionRecord create(
            ServiceSession session,
            int version,
            DecisionStatus status,
            RejectionType rejectionType,
            String rejectionReasonPl,
            String justificationPl,
            String nextStepsPl,
            String ruleCategory,
            UUID previousDecisionId
    ) {
        return create(
                session,
                version,
                status,
                rejectionType,
                rejectionReasonPl,
                justificationPl,
                nextStepsPl,
                ruleCategory,
                previousDecisionId,
                "backend-rules-v1",
                "decision-rules-v1"
        );
    }

    public static DecisionRecord create(
            ServiceSession session,
            int version,
            DecisionStatus status,
            RejectionType rejectionType,
            String rejectionReasonPl,
            String justificationPl,
            String nextStepsPl,
            String ruleCategory,
            UUID previousDecisionId,
            String model,
            String promptVersion
    ) {
        DecisionRecord decisionRecord = new DecisionRecord(
                session,
                version,
                status,
                rejectionType,
                rejectionReasonPl,
                justificationPl,
                nextStepsPl,
                ruleCategory,
                previousDecisionId,
                model,
                promptVersion
        );
        session.addDecisionRecord(decisionRecord);
        return decisionRecord;
    }

    public int getVersion() {
        return version;
    }

    public UUID getId() {
        return id;
    }

    public DecisionStatus getStatus() {
        return status;
    }

    public RejectionType getRejectionType() {
        return rejectionType;
    }

    public String getRejectionReasonPl() {
        return rejectionReasonPl;
    }

    public String getJustificationPl() {
        return justificationPl;
    }

    public String getNextStepsPl() {
        return nextStepsPl;
    }

    public String getRuleCategory() {
        return ruleCategory;
    }

    public UUID getPreviousDecisionId() {
        return previousDecisionId;
    }

    public String getModel() {
        return model;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
