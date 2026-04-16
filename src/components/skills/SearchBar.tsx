import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import styles from "./SearchBar.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(next: string) {
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), 150);
  }

  function handleClear() {
    setLocal("");
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className={styles.root}>
      <Search size={12} className={styles.icon} />
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder="Search plugins & skills…"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      {local ? (
        <button
          type="button"
          className={styles.clear}
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X size={10} />
        </button>
      ) : null}
    </div>
  );
}
