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
};

export type ChatResponse = {
  success: boolean;
  data: {
    message: string;
    sessionId: string | null;
  };
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
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
}) {
  return apiRequest<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}