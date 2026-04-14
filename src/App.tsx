import styles from "./App.module.css";

function App() {
  return (
    <div className={styles.root}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>GlassForge</h1>
          <p className={styles.subtitle}>
            A glassy Linux GUI for Claude Code — coming to life.
          </p>
        </header>
        <div className={styles.card}>
          <p className={styles.status}>
            Phase 2 — Tauri 2 + React + TypeScript scaffold online.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
