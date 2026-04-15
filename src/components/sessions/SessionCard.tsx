import { X } from "lucide-react";

import * as log from "@/lib/log";
import { removeSession as removeSessionCmd } from "@/lib/tauri-commands";
import type { SessionInfo } from "@/lib/types";
import { useSessionStore } from "@/stores/sessionStore";

import styles from "./SessionCard.module.css";

type Props = {
  session: SessionInfo;
  active: boolean;
  onSelect: () => void;
};

export function SessionCard({ session, active, onSelect }: Props) {
  const projectName =
    session.project_path.split("/").filter(Boolean).pop() ??
    session.project_path;
  const removeFromStore = useSessionStore((s) => s.removeSession);

  async function onClose(e: React.MouseEvent) {
    e.stopPropagation();
    // Tell the backend to kill any running child + drop the registry
    // entry, then mirror that on the frontend store. Backend errors
    // shouldn't leave the UI with a ghost session, so we unconditionally
    // remove client-side after attempting the command.
    try {
      await removeSessionCmd(session.id);
    } catch (err) {
      log.warn("remove_session failed", err);
    }
    removeFromStore(session.id);
  }

  return (
    <button
      type="button"
      className={`${styles.card} ${active ? styles.active : ""}`}
      onClick={onSelect}
    >
      <div className={styles.header}>
        <span className={`${styles.dot} ${styles[session.status]}`} />
        <span className={styles.name} title={session.project_path}>
          {projectName}
        </span>
        <span
          className={styles.kill}
          role="button"
          tabIndex={-1}
          aria-label="Close session"
          title="Close session"
          onClick={onClose}
        >
          <X size={12} />
        </span>
      </div>
      <div className={styles.meta}>
        <span className={styles.model}>{session.model ?? "default"}</span>
        <span className={styles.status}>{session.status}</span>
      </div>
    </button>
  );
}
