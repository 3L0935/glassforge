import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";

import {
  estimateTokens,
  formatCost,
  formatTokens,
  resolvePricing,
} from "@/lib/pricing";
import type { ChatEntry, SessionInfo } from "@/lib/types";
import { useSessionStore, type SessionUsage } from "@/stores/sessionStore";

import { ContextRing } from "@/components/stats/ContextRing";

import styles from "./ChatView.module.css";

const MODEL_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Opus 4.6", value: "opus" },
  { label: "Sonnet 4.6", value: "sonnet" },
  { label: "Haiku 4.5", value: "haiku" },
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries]);

  const stats = useMemo(() => {
    const pricing = resolvePricing(session.model);
    const inT = usage ? estimateTokens(usage.bytesIn) : 0;
    const outT = usage ? estimateTokens(usage.bytesOut) : 0;
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
          <div className={styles.projectPath} title={session.project_path}>
            {session.project_path}
          </div>
          <div className={styles.meta}>
            <select
              className={styles.modelSelect}
              value={session.model ?? ""}
              onChange={(e) =>
                updateSession(session.id, { model: e.target.value || null })
              }
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.label} value={m.value ?? ""}>
                  {m.label}
                </option>
              ))}
            </select>
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
        <MarkdownText text={entry.text} />
      </div>
    );
  }
  if (entry.kind === "assistant") {
    return (
      <div className={`${styles.entry} ${styles.assistantEntry}`}>
        <MarkdownText text={entry.text} />
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

// Minimal markdown-ish renderer: fenced code blocks become <pre>, inline
// `code` becomes <code>. Avoids pulling a full markdown lib for v0.1.
function MarkdownText({ text }: { text: string }) {
  const parts = useMemo(() => parseFencedBlocks(text), [text]);
  return (
    <div className={styles.markdown}>
      {parts.map((p, i) =>
        p.kind === "code" ? (
          <pre key={i} className={styles.codeBlock} data-lang={p.lang}>
            {p.body}
          </pre>
        ) : (
          <InlineText key={i} body={p.body} />
        ),
      )}
    </div>
  );
}

type TextOrCode =
  | { kind: "code"; lang: string; body: string }
  | { kind: "text"; body: string };

function parseFencedBlocks(text: string): TextOrCode[] {
  const out: TextOrCode[] = [];
  const fence = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", body: text.slice(last, m.index) });
    }
    out.push({ kind: "code", lang: m[1] ?? "", body: m[2] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: "text", body: text.slice(last) });
  }
  return out;
}

function InlineText({ body }: { body: string }) {
  const segments = useMemo(() => parseInlineCode(body), [body]);
  return (
    <p className={styles.paragraph}>
      {segments.map((s, i) =>
        s.kind === "code" ? (
          <code key={i} className={styles.inlineCode}>
            {s.body}
          </code>
        ) : (
          <span key={i}>{s.body}</span>
        ),
      )}
    </p>
  );
}

type TextOrInlineCode =
  | { kind: "text"; body: string }
  | { kind: "code"; body: string };

function parseInlineCode(body: string): TextOrInlineCode[] {
  const out: TextOrInlineCode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", body: body.slice(last, m.index) });
    }
    out.push({ kind: "code", body: m[1] });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    out.push({ kind: "text", body: body.slice(last) });
  }
  return out;
}
