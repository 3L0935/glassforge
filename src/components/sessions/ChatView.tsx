import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight, GitBranch, Wrench } from "lucide-react";

import * as log from "@/lib/log";
import {
  estimateTokens,
  formatCost,
  formatTokens,
  resolvePricing,
} from "@/lib/pricing";
import {
  readGitInfo,
  type GitInfo,
  type PermissionMode,
} from "@/lib/tauri-commands";
import type { ChatEntry, SessionInfo } from "@/lib/types";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { useSessionStore, type SessionUsage } from "@/stores/sessionStore";

import { ContextRing } from "@/components/stats/ContextRing";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";

import styles from "./ChatView.module.css";

const MODEL_OPTIONS: DropdownOption<string | null>[] = [
  { label: "Default", value: null },
  { label: "Opus 4.6", value: "opus" },
  { label: "Sonnet 4.6", value: "sonnet" },
  { label: "Haiku 4.5", value: "haiku" },
];

const EFFORT_OPTIONS: DropdownOption<string | null>[] = [
  { label: "Effort: auto", value: null },
  { label: "Effort: low", value: "low" },
  { label: "Effort: medium", value: "medium" },
  { label: "Effort: high", value: "high" },
  { label: "Effort: max", value: "max" },
];

const PERMISSION_OPTIONS: DropdownOption<PermissionMode>[] = [
  { label: "Manual approval", value: "manual" },
  { label: "Accept edits", value: "acceptEdits" },
  { label: "Bypass", value: "bypassPermissions" },
  { label: "Plan only", value: "plan" },
];

type Props = {
  session: SessionInfo;
  entries: ChatEntry[];
};

export function ChatView({ session, entries }: Props) {
  const updateSession = useSessionStore((s) => s.updateSession);
  const usage = useSessionStore(
    (s) => s.usage[session.id] ?? null,
  ) as SessionUsage | null;
  const permissionMode = usePreferencesStore((s) => s.permissionMode);
  const setPermissionMode = usePreferencesStore(
    (s) => s.setPermissionMode,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [git, setGit] = useState<GitInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    readGitInfo(session.project_path)
      .then((g) => {
        if (!cancelled) setGit(g);
      })
      .catch((e) => log.warn("read_git_info failed", e));
    return () => {
      cancelled = true;
    };
  }, [session.project_path]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries]);

  const stats = useMemo(() => {
    const pricing = resolvePricing(session.model);
    const hasReal = usage && (usage.inputTokens > 0 || usage.outputTokens > 0);
    const inT = hasReal ? usage.inputTokens : usage ? estimateTokens(usage.bytesIn) : 0;
    const outT = hasReal ? usage.outputTokens : usage ? estimateTokens(usage.bytesOut) : 0;
    return {
      inT,
      outT,
      used: inT + outT,
      total: pricing.contextWindow,
      cost: usage?.totalCostUsd ?? 0,
    };
  }, [usage, session.model]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.projectLine}>
            {git ? (
              <>
                <span className={styles.repoName}>{git.repoName}</span>
                {git.branch ? (
                  <span className={styles.branch}>
                    <GitBranch size={11} />
                    {git.branch}
                  </span>
                ) : null}
                <span className={styles.projectPathDim} title={session.project_path}>
                  {session.project_path}
                </span>
              </>
            ) : (
              <div className={styles.projectPath} title={session.project_path}>
                {session.project_path}
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <Dropdown
              size="sm"
              ariaLabel="Model"
              options={MODEL_OPTIONS}
              value={session.model ?? null}
              onChange={(v) => updateSession(session.id, { model: v })}
            />
            <Dropdown
              size="sm"
              ariaLabel="Effort"
              options={EFFORT_OPTIONS}
              value={session.effort ?? null}
              onChange={(v) => updateSession(session.id, { effort: v })}
            />
            <Dropdown
              size="sm"
              ariaLabel="Permission mode"
              options={PERMISSION_OPTIONS}
              value={permissionMode}
              onChange={(v) => void setPermissionMode(v)}
            />
            <span className={styles.dot}>•</span>
            <span className={styles[session.status]}>{session.status}</span>
            <span className={styles.dot}>•</span>
            <span>
              in {formatTokens(stats.inT)} · out {formatTokens(stats.outT)}
            </span>
            <span className={styles.dot}>•</span>
            <span>{formatCost(stats.cost)}</span>
          </div>
        </div>
        <ContextRing
          used={stats.used}
          total={stats.total}
          size={54}
          label="ctx"
        />
      </div>

      <div ref={scrollRef} className={styles.log}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <p>Session ready. Send your first message below.</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <Entry key={entryKey(entry, i)} entry={entry} />
          ))
        )}
        {session.status === "running" ? (
          <div className={`${styles.entry} ${styles.typing}`}>
            <div className={styles.typingDots}>
              <span />
              <span />
              <span />
            </div>
            <span className={styles.typingLabel}>Claude is thinking…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function entryKey(entry: ChatEntry, i: number): string {
  if (entry.kind === "tool") return `tool-${entry.id}-${i}`;
  return `${entry.kind}-${entry.ts}-${i}`;
}

function Entry({ entry }: { entry: ChatEntry }) {
  if (entry.kind === "user") {
    return (
      <div className={`${styles.entry} ${styles.userEntry}`}>
        <div className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {entry.text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
  if (entry.kind === "assistant") {
    return (
      <div className={`${styles.entry} ${styles.assistantEntry}`}>
        <div className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {entry.text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
  if (entry.kind === "tool") {
    return <ToolCall entry={entry} />;
  }
  if (entry.kind === "result") {
    return (
      <div className={`${styles.entry} ${styles.resultEntry}`}>
        {typeof entry.costUsd === "number"
          ? `cost ${formatCost(entry.costUsd)}`
          : "result"}
        {entry.durationMs
          ? ` · ${(entry.durationMs / 1000).toFixed(1)}s`
          : ""}
        {entry.numTurns ? ` · ${entry.numTurns} turns` : ""}
      </div>
    );
  }
  if (entry.kind === "error") {
    return (
      <div className={`${styles.entry} ${styles.errorEntry}`}>
        {entry.text}
      </div>
    );
  }
  return (
    <div className={`${styles.entry} ${styles.systemEntry}`}>
      <pre className={styles.entryText}>{entry.text}</pre>
    </div>
  );
}

function ToolCall({
  entry,
}: {
  entry: Extract<ChatEntry, { kind: "tool" }>;
}) {
  const [open, setOpen] = useState(false);
  const inputPreview = useMemo(() => {
    try {
      const s = JSON.stringify(entry.input);
      if (!s) return "";
      return s.length > 120 ? s.slice(0, 120) + "…" : s;
    } catch {
      return "";
    }
  }, [entry.input]);

  return (
    <div
      className={`${styles.entry} ${styles.toolEntry} ${
        entry.isError ? styles.toolError : ""
      }`}
    >
      <button
        type="button"
        className={styles.toolHeader}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Wrench size={12} />
        <span className={styles.toolName}>{entry.name}</span>
        {!open && inputPreview ? (
          <span className={styles.toolPreview}>{inputPreview}</span>
        ) : null}
      </button>
      {open ? (
        <div className={styles.toolBody}>
          {entry.input !== undefined ? (
            <>
              <div className={styles.toolLabel}>input</div>
              <pre className={styles.toolCode}>
                {JSON.stringify(entry.input, null, 2)}
              </pre>
            </>
          ) : null}
          {entry.result ? (
            <>
              <div className={styles.toolLabel}>result</div>
              <pre className={styles.toolCode}>{entry.result}</pre>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

