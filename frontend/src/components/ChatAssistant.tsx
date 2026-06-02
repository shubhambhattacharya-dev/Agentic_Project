import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FiMessageCircle, FiSend, FiWifi, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { getHealth, sendChatMessage, type UiChatMessage } from "@/lib/api";

function createSessionId() {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `gigi-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I am GIGI. Ask me about orders, refunds, shipping, or ingredients.",
    },
  ]);
  const sessionId = useMemo(createSessionId, []);

  const health = useQuery({
    queryKey: ["api-health"],
    queryFn: getHealth,
    refetchInterval: 30000,
  });

  const chat = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (response: any) => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.data.message,
        },
      ]);
    },
    onError: (error: any) => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "I could not reach support right now. Please try again.",
        },
      ]);
    },
  });

  const isHealthy = health.data?.success && health.data.status === "healthy";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || chat.isPending) return;

    const nextMessages: UiChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    chat.mutate({
      sessionId,
      messages: nextMessages,
    });
  };

  return (
    <section className={`chat-assistant ${open ? "is-open" : ""}`} aria-label="Gigi support assistant">
      {open ? (
        <div className="chat-assistant__panel">
          <div className="chat-assistant__header">
            <div>
              <h2>GIGI Support</h2>
              <span className={isHealthy ? "is-online" : "is-offline"}>
                <FiWifi />
                {isHealthy ? "Backend connected" : "Backend unavailable"}
              </span>
            </div>
            <Button variant="icon" size="icon" aria-label="Close chat" onClick={() => setOpen(false)}>
              <FiX />
            </Button>
          </div>
          <div className="chat-assistant__messages">
            {messages.map((message, index) => (
              <div className={`chat-bubble chat-bubble--${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {chat.isPending && <div className="chat-bubble chat-bubble--assistant">Let me check.</div>}
          </div>
          <form className="chat-assistant__form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about orders, refunds, shipping..."
              aria-label="Message GIGI support"
            />
            <Button variant="dark" size="icon" aria-label="Send message" disabled={chat.isPending}>
              <FiSend />
            </Button>
          </form>
        </div>
      ) : (
        <Button className="chat-assistant__launcher" variant="dark" onClick={() => setOpen(true)}>
          <FiMessageCircle />
          Ask GIGI
        </Button>
      )}
    </section>
  );
}
