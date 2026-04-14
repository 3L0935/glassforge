import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import styles from "./Dropdown.module.css";

export type DropdownOption<T> = {
  label: string;
  value: T;
};

type Props<T> = {
  options: DropdownOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  placeholder?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
};

// Custom dropdown that replaces native `<select>`. Native selects can't be
// styled beyond the closed trigger on Linux/WebKit, so we roll our own with
// a glass-themed menu, keyboard support, and outside-click dismiss.
export function Dropdown<T>({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder,
  size = "md",
  fullWidth = false,
  className,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [highlight, setHighlight] = useState(activeIndex);

  useEffect(() => {
    if (!open) return;
    setHighlight(activeIndex);
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
    // activeIndex intentionally omitted — we only reset highlight on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(highlight);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(options.length - 1);
    }
  }

  const selected = options.find((o) => o.value === value);

  return (
    <div
      ref={rootRef}
      className={[
        styles.root,
        size === "sm" ? styles.sm : "",
        fullWidth ? styles.fullWidth : "",
        open ? styles.open : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={styles.label}>
          {selected?.label ?? placeholder ?? ""}
        </span>
        <ChevronDown
          size={size === "sm" ? 10 : 12}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
        />
      </button>
      {open ? (
        <ul
          ref={menuRef}
          className={styles.menu}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onMenuKey}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isHighlighted = i === highlight;
            return (
              <li
                key={`${o.label}-${i}`}
                role="option"
                aria-selected={isSelected}
                className={[
                  styles.option,
                  isSelected ? styles.optionSelected : "",
                  isHighlighted ? styles.optionHighlighted : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(i)}
              >
                <span className={styles.optionLabel}>{o.label}</span>
                {isSelected ? (
                  <span className={styles.optionTick} aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
