import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";

import type { CatalogEntry, Scope } from "@/lib/types";
import { useCatalogStore } from "@/stores/catalogStore";

import { ScopeDropdown } from "./ScopeDropdown";
import styles from "./ActionBar.module.css";

export function ActionBar({ entry }: { entry: CatalogEntry }) {
  const install = useCatalogStore((s) => s.install);
  const uninstall = useCatalogStore((s) => s.uninstall);
  const changeScope = useCatalogStore((s) => s.changeScope);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>(entry.installed?.scope ?? "User");

  async function handleInstall() {
    setBusy(true);
    setError(null);
    try {
      await install(entry.id, scope);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleUninstall() {
    setBusy(true);
    setError(null);
    try {
      await uninstall(entry.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleScopeChange(newScope: Scope) {
    setScope(newScope);
    if (entry.installed) {
      setBusy(true);
      setError(null);
      try {
        await changeScope(entry.id, newScope);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }
  }

  const isInstalled = entry.installed != null;

  return (
    <div className={styles.root}>
      <div className={styles.actions}>
        {isInstalled ? (
          <>
            <span className={styles.installedBadge}>
              <Check size={12} />
              Installed
            </span>
            <ScopeDropdown value={scope} onChange={handleScopeChange} disabled={busy} />
            <button
              type="button"
              className={styles.uninstallButton}
              onClick={handleUninstall}
              disabled={busy}
            >
              {busy ? <Loader2 size={12} className={styles.spin} /> : <Trash2 size={12} />}
              Uninstall
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.installButton}
              onClick={handleInstall}
              disabled={busy}
            >
              {busy ? <Loader2 size={12} className={styles.spin} /> : null}
              Install
            </button>
            <ScopeDropdown value={scope} onChange={setScope} disabled={busy} />
          </>
        )}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
