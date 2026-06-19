"use client";

import { FormEvent, useRef, useState } from "react";
import type { ImageRetryResponse } from "@/lib/api/sessions";

type ImageRetryProps = {
  retry: ImageRetryResponse;
  terminalState?: string | null;
  onRetry: (image: File) => Promise<void>;
};

export function ImageRetry({ retry, terminalState, onRetry }: ImageRetryProps) {
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const isTerminal = terminalState === "IN_PERSON_VERIFICATION_REQUIRED";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedImage = image ?? imageInputRef.current?.files?.[0] ?? null;

    if (!selectedImage) {
      setError("Dodaj jedno nowe zdjęcie sprzętu.");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      await onRetry(selectedImage);
      setImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } catch (caught) {
      setError(toMessage(caught));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="grid gap-3 p-4 text-sm">
      {isTerminal ? (
        <p className="rounded-md border border-warning bg-[#fff8c5] px-3 py-2 font-medium text-[#7d4e00]">
          Wymagana weryfikacja osobista.
        </p>
      ) : null}
      <div>
        <p className="font-medium text-foreground">Zdjęcie wymaga poprawy</p>
        <p className="mt-1 text-muted">{retry.reasonPl}</p>
      </div>
      <p className="font-medium">Pozostałe próby: {retry.remainingAttempts}</p>
      {!isTerminal && retry.remainingAttempts > 0 ? (
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Nowe zdjęcie sprzętu</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="rounded-md border border-borderDefault bg-canvas px-3 py-2"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 1) {
                  setImage(null);
                  setError("Dodaj tylko jedno zdjęcie sprzętu.");
                  return;
                }
                setImage(files[0] ?? null);
                setError(null);
              }}
              ref={imageInputRef}
              type="file"
            />
          </label>
          {error ? <p className="text-danger">{error}</p> : null}
          <div>
            <button
              className="min-h-[40px] rounded-md bg-success px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Wysyłanie..." : "Wyślij nowe zdjęcie"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function toMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "messagePl" in error &&
    typeof error.messagePl === "string"
  ) {
    return error.messagePl;
  }

  return "Nie udało się wysłać zdjęcia.";
}
