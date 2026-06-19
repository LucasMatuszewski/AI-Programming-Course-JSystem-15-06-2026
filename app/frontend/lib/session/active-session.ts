const ACTIVE_SESSION_KEY = "best-service.activeSessionId";

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function saveActiveSessionId(sessionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export function clearActiveSessionId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_SESSION_KEY);
}
