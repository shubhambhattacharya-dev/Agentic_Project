export type UiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type HealthResponse = {
  success: boolean;
  status: "healthy" | "unhealthy";
  database?: "connected" | "disconnected";
  message?: string;
  timestamp: string;
  sentry?: string;
  clerk?: string;
};

export type ChatResponse = {
  success: boolean;
  data: {
    message: string;
    sessionId: string | null;
  };
};

// In production (Vercel), VITE_API_URL points to the deployed backend.
// In dev, Vite proxy handles /api → localhost:5000, so we use same-origin.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const { headers: _unused, ...restInit } = init ?? {}; // eslint-disable-line @typescript-eslint/no-unused-vars

  const response = await fetch(`${API_BASE}${path}`, {
    headers: mergedHeaders,
    ...restInit,
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export function getHealth() {
  return apiRequest<HealthResponse>("/api/health");
}

export function sendChatMessage(input: {
  sessionId: string;
  messages: UiChatMessage[];
  token?: string;
}) {
  const headers: Record<string, string> = {};

  if (input.token) {
    headers["Authorization"] = `Bearer ${input.token}`;
  }

  return apiRequest<ChatResponse>("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sessionId: input.sessionId,
      messages: input.messages,
    }),
  });
}