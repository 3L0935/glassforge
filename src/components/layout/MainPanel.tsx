import type { SessionEntry } from "@/lib/types";
import { useSessionStore } from "@/stores/sessionStore";
import { ChatView } from "@/components/sessions/ChatView";
import { ComposeInput } from "@/components/sessions/ComposeInput";

import styles from "./MainPanel.module.css";

// Stable module-level empty array: returning `[]` from a selector on every
// call creates a new reference, which trips zustand's useSyncExternalStore
// into thinking the snapshot changed, producing an infinite update loop
// (React error #185). Use one frozen reference for the "no entries" case.
const EMPTY_ENTRIES: readonly SessionEntry[] = Object.freeze([]);

export function MainPanel() {
  const activeId = useSessionStore((s) => s.activeId);
  const activeSession = useSessionStore((s) =>
    s.activeId ? (s.sessions[s.activeId] ?? null) : null,
  );
  const activeEntries = useSessionStore((s) =>
    s.activeId ? (s.entries[s.activeId] ?? EMPTY_ENTRIES) : EMPTY_ENTRIES,
  ) as SessionEntry[];

  void activeId;
  if (!activeSession) {
    return (
      <main className={styles.root}>
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No active session</h2>
          <p className={styles.emptySubtitle}>
            Spawn a new Claude Code session from the sidebar to get started.
          </p>
        </div>
      </main>
    );
  }

  const disabled =
    activeSession.status === "done" || activeSession.status === "error";

  return (
    <main className={styles.root}>
      <ChatView session={activeSession} entries={activeEntries} />
      <ComposeInput sessionId={activeSession.id} disabled={disabled} />
    </main>
  );
}
