"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike
} from "@assistant-ui/react";
import type { ChatMessageResponse, SessionResponse } from "@/lib/api/sessions";

type AssistantChatProps = {
  session: SessionResponse;
  onSend: (contentPl: string) => Promise<SessionResponse>;
  onSessionUpdated?: (session: SessionResponse) => void;
};

type RuntimeMessage = {
  role: "user" | "assistant";
  content: string;
};

export function AssistantChat({
  session,
  onSend,
  onSessionUpdated
}: AssistantChatProps) {
  const [draft, setDraft] = useState("");
  const [isPending, setIsPending] = useState(false);
  const messages = [...(session.messages ?? [])].sort(
    (left, right) => left.sequenceNumber - right.sequenceNumber
  );
  const runtimeMessages = useMemo(
    () => messages.map(toRuntimeMessage),
    [messages]
  );

  async function sendMessage(contentPl: string) {
    const normalized = contentPl.trim();
    if (!normalized) {
      return;
    }

    setIsPending(true);
    try {
      const updatedSession = await onSend(normalized);
      onSessionUpdated?.(updatedSession);
      setDraft("");
    } finally {
      setIsPending(false);
    }
  }

  const runtime = useExternalStoreRuntime({
    isRunning: isPending,
    messages: runtimeMessages,
    convertMessage: convertRuntimeMessage,
    onNew: async (message: AppendMessage) => {
      await sendMessage(extractText(message));
    }
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(draft);
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section className="grid min-h-[420px] grid-rows-[auto_1fr_auto]">
        <div className="border-b border-borderDefault px-4 py-3">
          <h2 className="text-xl font-semibold leading-8">Czat sprawy</h2>
        </div>
        <div className="grid content-start gap-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <ChatBubble key={message.messageId} message={message} />
          ))}
        </div>
        <form
          className="border-t border-borderDefault p-4"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium">Wiadomość do asystenta</span>
            <textarea
              className="min-h-24 resize-y rounded-md border border-borderDefault bg-canvas px-3 py-2 text-sm"
              disabled={isPending}
              onChange={(event) => setDraft(event.target.value)}
              value={draft}
            />
          </label>
          <div className="mt-3 flex justify-end">
            <button
              className="min-h-[40px] rounded-md bg-success px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending || !draft.trim()}
              type="submit"
            >
              {isPending ? "Wysyłanie..." : "Wyślij"}
            </button>
          </div>
        </form>
      </section>
    </AssistantRuntimeProvider>
  );
}

function ChatBubble({ message }: { message: ChatMessageResponse }) {
  const isCustomer = message.role === "CUSTOMER";
  const label = isCustomer ? "Klient" : "Asystent";

  return (
    <article
      className={[
        "grid gap-1",
        isCustomer ? "justify-items-end" : "justify-items-start"
      ].join(" ")}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      {message.messageType === "DECISION_UPDATE" ? (
        <p className="text-xs font-medium text-warning">
          Decyzja zaktualizowana
        </p>
      ) : null}
      <div
        className={[
          "max-w-[82%] rounded-md border px-3 py-2 text-sm leading-6",
          isCustomer
            ? "border-[#1f883d] bg-[#dafbe1] text-foreground"
            : "border-borderDefault bg-subtle text-foreground"
        ].join(" ")}
      >
        {message.contentPl}
      </div>
    </article>
  );
}

function toRuntimeMessage(message: ChatMessageResponse): RuntimeMessage {
  return {
    role: message.role === "CUSTOMER" ? "user" : "assistant",
    content: message.contentPl
  };
}

function convertRuntimeMessage(message: RuntimeMessage): ThreadMessageLike {
  return {
    role: message.role,
    content: [{ type: "text", text: message.content }]
  };
}

function extractText(message: AppendMessage): string {
  const parts = message.content as Array<{ type: string; text?: string }>;
  return parts.find((part) => part.type === "text")?.text ?? "";
}
