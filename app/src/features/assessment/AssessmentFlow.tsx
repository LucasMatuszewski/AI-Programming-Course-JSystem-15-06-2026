"use client";

import { useState } from "react";

import { ChatThread } from "@/features/chat/ChatThread";
import {
  buildAssessmentFormData,
  emptyIntakeFormValues,
  IntakeForm,
  type IntakeFormValues
} from "@/features/intake/IntakeForm";
import type { AssessmentError } from "@/shared/contracts";

import styles from "./AssessmentFlow.module.css";
import type { AssessmentErrorResponse, AssessmentSuccessResponse } from "./types";

type ScreenState = "FORM" | "PROCESSING" | "CHAT" | "ERROR";

type ActiveCase = AssessmentSuccessResponse | null;

export function AssessmentFlow() {
  const [screen, setScreen] = useState<ScreenState>("FORM");
  const [draft, setDraft] = useState<IntakeFormValues>(() => emptyIntakeFormValues());
  const [activeCase, setActiveCase] = useState<ActiveCase>(null);
  const [lastError, setLastError] = useState<AssessmentError | null>(null);

  const submitAssessment = async (values: IntakeFormValues) => {
    setDraft(values);
    setScreen("PROCESSING");
    setLastError(null);

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        body: buildAssessmentFormData(values)
      });
      const body = (await response.json()) as AssessmentSuccessResponse | AssessmentErrorResponse;

      if (!response.ok || "error" in body) {
        setLastError("error" in body ? body.error : fallbackError);
        setScreen("ERROR");
        return;
      }

      setActiveCase(body);
      setScreen("CHAT");
    } catch {
      setLastError(fallbackError);
      setScreen("ERROR");
    }
  };

  const startNewRequest = () => {
    setDraft(emptyIntakeFormValues());
    setActiveCase(null);
    setLastError(null);
    setScreen("FORM");
  };

  if (screen === "PROCESSING") {
    return (
      <div className={`${styles.panel} ${styles.processing}`} aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <h2>Analizujemy zgłoszenie</h2>
        <p>Analizujemy zdjęcie i przygotowujemy ocenę...</p>
      </div>
    );
  }

  if (screen === "ERROR") {
    return (
      <div className={`${styles.panel} ${styles.error}`} role="alert">
        <span className="shell-step-badge">Błąd oceny</span>
        <h2>Nie możemy teraz dokończyć oceny.</h2>
        <p>{lastError?.message ?? fallbackError.message}</p>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={() => submitAssessment(draft)} type="button">
            Spróbuj ponownie
          </button>
          <button className={styles.ghost} onClick={() => setScreen("FORM")} type="button">
            Wróć do formularza
          </button>
        </div>
      </div>
    );
  }

  if (screen === "CHAT" && activeCase) {
    return (
      <div className={styles.panel}>
        <div className="shell-panel-header">
          <span className="shell-step-badge">Decyzja wstępna</span>
          <h2>Wstępna ocena zgłoszenia</h2>
        </div>
        <ChatThread activeCase={activeCase} key={activeCase.caseId} onNewRequest={startNewRequest} />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className="shell-panel-header">
        <span className="shell-step-badge">Etap 1</span>
        <h2>Przygotuj zgłoszenie</h2>
      </div>
      <IntakeForm initialValues={draft} onSubmit={submitAssessment} />
    </div>
  );
}

const fallbackError: AssessmentError = {
  kind: "UNKNOWN",
  retryable: true,
  message: "Wystąpił problem techniczny. Spróbuj ponownie za chwilę."
};
