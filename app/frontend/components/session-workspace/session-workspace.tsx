"use client";

import { useEffect, useState } from "react";
import { AssistantChat } from "@/components/assistant-chat/assistant-chat";
import { CaseForm } from "@/components/case-form/case-form";
import { DecisionSummary } from "@/components/decision-summary/decision-summary";
import { ImageRetry } from "@/components/image-retry/image-retry";
import {
  getSession,
  postChatMessage,
  retryImageAttempt,
  type SessionResponse
} from "@/lib/api/sessions";
import {
  clearActiveSessionId,
  getActiveSessionId,
  saveActiveSessionId
} from "@/lib/session/active-session";

export function SessionWorkspace() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = getActiveSessionId();
    if (!sessionId) {
      return;
    }

    getSession(sessionId)
      .then(setSession)
      .catch(() => {
        clearActiveSessionId();
        setResumeError("Nie udało się przywrócić aktywnej sesji.");
      });
  }, []);

  function handleCreated(createdSession: SessionResponse) {
    setSession(createdSession);
    saveActiveSessionId(createdSession.sessionId);
  }

  async function handleRetry(image: File) {
    if (!session) {
      return;
    }
    const updated = await retryImageAttempt(session.sessionId, image);
    setSession(updated);
    saveActiveSessionId(updated.sessionId);
  }

  async function handleSend(contentPl: string) {
    if (!session) {
      throw new Error("Brak aktywnej sesji.");
    }
    const updated = await postChatMessage(session.sessionId, contentPl);
    setSession(updated);
    return updated;
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div
        id="formularz"
        className="rounded-md border border-borderDefault bg-canvas shadow-card"
      >
        {!session ? (
          <>
            <div className="border-b border-borderDefault px-4 py-3">
              <h2 className="text-xl font-semibold leading-8">
                Nowe zgłoszenie
              </h2>
            </div>
            <CaseForm onCreated={handleCreated} />
          </>
        ) : session.imageRetry ? (
          <ImageRetry
            onRetry={handleRetry}
            retry={session.imageRetry}
            terminalState={session.terminalState}
          />
        ) : (
          <AssistantChat
            onSend={handleSend}
            onSessionUpdated={setSession}
            session={session}
          />
        )}
      </div>

      <aside
        id="status"
        className="rounded-md border border-borderDefault bg-canvas"
      >
        <div className="border-b border-borderDefault px-4 py-3">
          <h2 className="text-xl font-semibold leading-8">Status sprawy</h2>
        </div>
        {session ? (
          <DecisionSummary session={session} />
        ) : (
          <div className="grid gap-3 p-4 text-sm text-muted">
            <p>Brak aktywnej sesji.</p>
            <p>
              Po wysłaniu formularza tutaj pojawi się decyzja, uzasadnienie i
              historia rozmowy.
            </p>
            {resumeError ? <p className="text-danger">{resumeError}</p> : null}
          </div>
        )}
      </aside>
    </section>
  );
}
