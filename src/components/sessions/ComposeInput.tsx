import { useRef, useState } from "react";
import { Send, Square } from "lucide-react";

import * as log from "@/lib/log";
import { killSession, sendMessage } from "@/lib/tauri-commands";
import { useSessionStore } from "@/stores/sessionStore";

import styles from "./ComposeInput.module.css";

type Props = {
  sessionId: string;
  disabled?: boolean;
};

export function ComposeInput({ sessionId, disabled }: Props) {
  const model = useSessionStore(
    (s) => s.sessions[sessionId]?.model ?? null,
  );
  const isRunning = useSessionStore(
    (s) => s.sessions[sessionId]?.status === "running",
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  async function onSubmit() {
    const message = text.trim();
    if (!message || busy || isRunning) return;
    setBusy(true);
    try {
      await sendMessage(sessionId, message, model);
      setText("");
    } catch (e) {
      log.error("send_message failed", e);
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  async function onCancel() {
    try {
      await killSession(sessionId);
    } catch (e) {
      log.error("kill_session failed", e);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  }

  return (
    <div className={styles.root}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        placeholder={
          disabled
            ? "Session is not ready."
            : isRunning
              ? "Claude is replying — wait or cancel to send again."
              : "Message Claude — Enter to send, Shift+Enter for newline"
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled || busy || isRunning}
        rows={2}
        spellCheck={false}
      />
      {isRunning ? (
        <button
          type="button"
          className={`${styles.sendButton} ${styles.cancelButton}`}
          onClick={() => void onCancel()}
          aria-label="Cancel current reply"
        >
          <Square size={12} />
        </button>
      ) : (
        <button
          type="button"
          className={styles.sendButton}
          onClick={() => void onSubmit()}
          disabled={disabled || busy || text.trim().length === 0}
          aria-label="Send message"
        >
          <Send size={14} />
        </button>
      )}
    </div>
  );
}
