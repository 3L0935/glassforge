import { Check, Eye, ShieldAlert, Wand } from "lucide-react";

import type { PermissionMode } from "@/lib/tauri-commands";
import { usePreferencesStore } from "@/stores/preferencesStore";

import styles from "./PermissionModeSection.module.css";

type Option = {
  value: PermissionMode;
  label: string;
  icon: typeof Check;
  description: string;
};

const OPTIONS: Option[] = [
  {
    value: "manual",
    label: "Manual",
    icon: Wand,
    description:
      "Popup for every tool call. Allow once, allow session, or deny.",
  },
  {
    value: "acceptEdits",
    label: "Accept edits",
    icon: Check,
    description:
      "Auto-approve file edits. Still asks on risky operations.",
  },
  {
    value: "bypassPermissions",
    label: "Bypass",
    icon: ShieldAlert,
    description: "Skip every permission check. Fast but trusting.",
  },
  {
    value: "plan",
    label: "Plan",
    icon: Eye,
    description: "Claude plans without executing any tool.",
  },
];

export function PermissionModeSection() {
  const mode = usePreferencesStore((s) => s.permissionMode);
  const setMode = usePreferencesStore((s) => s.setPermissionMode);

  return (
    <section className={styles.root}>
      <h3 className={styles.title}>Permission mode</h3>
      <p className={styles.hint}>
        Controls how Claude asks before running tools in every session.
      </p>
      <ul className={styles.list}>
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = opt.value === mode;
          return (
            <li key={opt.value}>
              <button
                type="button"
                className={`${styles.card} ${active ? styles.cardActive : ""}`}
                onClick={() => void setMode(opt.value)}
              >
                <div className={styles.cardHeader}>
                  <Icon size={14} className={styles.cardIcon} />
                  <span className={styles.cardLabel}>{opt.label}</span>
                  {active ? (
                    <span className={styles.activeDot} aria-hidden="true" />
                  ) : null}
                </div>
                <p className={styles.cardDescription}>{opt.description}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
