import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { Scope } from "@/lib/types";

import styles from "./ScopeDropdown.module.css";

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "User", label: "User" },
  { value: "Project", label: "Project" },
  { value: "Local", label: "Local" },
];

type Props = {
  value: Scope;
  onChange: (scope: Scope) => void;
  disabled?: boolean;
};

export function ScopeDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function handleSelect(scope: Scope) {
    onChange(scope);
    setOpen(false);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!rootRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  const currentLabel = SCOPE_OPTIONS.find((o) => o.value === value)?.label ?? "User";

  return (
    <div className={styles.root} ref={rootRef} onBlur={handleBlur}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.label}>Scope: {currentLabel}</span>
        <ChevronDown size={10} className={styles.chevron} />
      </button>
      {open ? (
        <div className={styles.menu} role="listbox">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`${styles.option} ${opt.value === value ? styles.optionActive : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
