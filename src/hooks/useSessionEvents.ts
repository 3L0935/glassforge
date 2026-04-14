import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import * as log from "@/lib/log";
import type { ClaudeEvent, SessionStatus } from "@/lib/types";
import { useSessionStore } from "@/stores/sessionStore";

// Subscribes the sessionStore to Tauri events for every known session.
// Re-runs whenever the set of session ids changes, tearing down old
// listeners and installing fresh ones in lockstep.
export function useSessionEvents(): void {
  const order = useSessionStore((s) => s.order);
  const handleClaudeEvent = useSessionStore((s) => s.handleClaudeEvent);
  const updateStatus = useSessionStore((s) => s.updateStatus);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let cancelled = false;

    async function attach() {
      for (const id of order) {
        const eventEvent = `session://${id}/event`;
        const statusEvent = `session://${id}/status`;
        const doneEvent = `session://${id}/done`;

        const u1 = await listen<ClaudeEvent>(eventEvent, (e) => {
          handleClaudeEvent(id, e.payload);
        });
        const u2 = await listen<SessionStatus>(statusEvent, (e) => {
          updateStatus(id, e.payload);
        });
        const u3 = await listen<unknown>(doneEvent, () => {
          // Reserved for future per-message completion UX.
        });

        if (cancelled) {
          u1();
          u2();
          u3();
          return;
        }
        unlisteners.push(u1, u2, u3);
      }
    }

    attach().catch((e) => log.error("session listener attach failed", e));

    return () => {
      cancelled = true;
      for (const fn of unlisteners) {
        try {
          fn();
        } catch (e) {
          log.warn("failed to unlisten", e);
        }
      }
    };
  }, [order, handleClaudeEvent, updateStatus]);
}
