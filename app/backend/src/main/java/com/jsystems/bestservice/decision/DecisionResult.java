package com.jsystems.bestservice.decision;

import com.jsystems.bestservice.persistence.DecisionStatus;
import com.jsystems.bestservice.persistence.RejectionType;
import com.jsystems.bestservice.persistence.TerminalState;

public record DecisionResult(
        DecisionStatus status,
        RejectionType rejectionType,
        String rejectionReasonPl,
        String justificationPl,
        String nextStepsPl,
        String ruleCategory,
        TerminalState terminalState
) {
}
