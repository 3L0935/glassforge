import styles from "./FilterPills.module.css";

type TypeFilter = "all" | "skill" | "plugin";
type StatusFilter = "all" | "installed" | "available" | "updates";

type Props = {
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  updateCount: number;
  onTypeChange: (f: TypeFilter) => void;
  onStatusChange: (f: StatusFilter) => void;
};

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "plugin", label: "Plugins" },
  { value: "skill", label: "Skills" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "installed", label: "Installed" },
  { value: "available", label: "Available" },
  { value: "updates", label: "Updates" },
];

export function FilterPills({
  typeFilter,
  statusFilter,
  updateCount,
  onTypeChange,
  onStatusChange,
}: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.row}>
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.pill} ${typeFilter === opt.value ? styles.active : ""}`}
            onClick={() => onTypeChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.pill} ${statusFilter === opt.value ? styles.active : ""} ${opt.value === "updates" ? styles.updatesPill : ""}`}
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
            {opt.value === "updates" && updateCount > 0 ? (
              <span className={styles.badge}>{updateCount}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
