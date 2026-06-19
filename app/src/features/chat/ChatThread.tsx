"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState } from "react";

import { DecisionCard } from "@/features/assessment/DecisionCard";
import type { AssessmentSuccessResponse, DecisionCardMessage } from "@/features/assessment/types";

import styles from "./ChatThread.module.css";

type ChatThreadProps = {
  activeCase: AssessmentSuccessResponse;
  onNewRequest: () => void;
};

const initialAssistantMessageId = "initial-decision-card";

export function ChatThread({ activeCase, onNewRequest }: ChatThreadProps) {
  const [input, setInput] = useState("");
  const caseContext = useMemo(
    () => ({
      caseId: activeCase.caseId,
      submission: activeCase.submission,
      imageAnalysis: activeCase.imageAnalysis,
      decision: activeCase.decision
    }),
    [activeCase]
  );
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { caseContext }
      }),
    [caseContext]
  );
  const { messages, sendMessage, status, error, regenerate } = useChat({
    id: activeCase.caseId,
    messages: [toInitialUiMessage(activeCase.firstAssistantMessage)],
    transport
  });
  const isStreaming = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !isStreaming && status !== "error";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    void sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className={styles.thread}>
      <div className={styles.topActions}>
        <button className={styles.ghost} onClick={onNewRequest} type="button">
          Nowe zgłoszenie
        </button>
      </div>

      <DecisionCard message={activeCase.firstAssistantMessage} />

      <div className={styles.messages} aria-live="polite">
        {messages
          .filter((message) => message.id !== initialAssistantMessageId)
          .map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
      </div>

      {isStreaming ? <p className={styles.status}>Asystent odpowiada...</p> : null}
      {error ? (
        <div role="alert">
          <p className={styles.error}>Nie udało się wysłać odpowiedzi. Możesz ponowić ostatnią turę.</p>
          <button className={styles.ghost} onClick={() => void regenerate()} type="button">
            Ponów odpowiedź
          </button>
        </div>
      ) : null}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.visuallyHidden} htmlFor="chat-message">
          Wiadomość
        </label>
        <div className={styles.composerRow}>
          <textarea
            aria-label="Wiadomość"
            className={styles.input}
            disabled={isStreaming || status === "error"}
            id="chat-message"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Dopytaj o tę sprawę..."
            rows={1}
            value={input}
          />
          <button className={styles.button} disabled={!canSend} type="submit">
            Wyślij
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const label = message.role === "user" ? "Ty" : "Asystent";

  return (
    <article className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}>
      <span className={styles.messageLabel}>{label}</span>
      {message.parts.map((part, index) => {
        if (part.type !== "text") {
          return null;
        }

        return (
          <p className={styles.part} key={`${message.id}-${index}`}>
            {part.text}
          </p>
        );
      })}
    </article>
  );
}

function toInitialUiMessage(message: DecisionCardMessage): UIMessage {
  return {
    id: initialAssistantMessageId,
    role: "assistant",
    parts: [{ type: "text", text: message.content }]
  };
}
