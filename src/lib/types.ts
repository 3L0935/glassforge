// ── Catalog types (mirrors Rust catalog::types) ─────────────

export type EntryType = "Skill" | "Plugin";

export type Source =
  | { Marketplace: { name: string } }
  | "Standalone"
  | { Git: { url: string } };

export type Scope = "User" | "Project" | "Local";

export type InstalledInfo = {
  scope: Scope;
  version: string;
  path: string;
  has_update: boolean;
};

export type CatalogEntry = {
  id: string;
  name: string;
  description: string;
  entry_type: EntryType;
  source: Source;
  version: string | null;
  author: string | null;
  license: string | null;
  homepage: string | null;
  repository: string | null;
  category: string | null;
  keywords: string[];
  install_count: number | null;
  installed: InstalledInfo | null;
};

// ── Session types ───────────────────────────────────────────

export type SessionStatus = "idle" | "running" | "error" | "done";

export type SessionInfo = {
  id: string;
  project_path: string;
  model: string | null;
  effort: string | null;
  claude_session_id: string | null;
  status: SessionStatus;
  created_at: number;
};

// Content blocks inside claude assistant / user messages.
export type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: unknown;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string | ContentBlock[];
      is_error?: boolean;
    }
  | { type: "thinking"; thinking?: string }
  | { type: string; [k: string]: unknown };

export type AssistantMessage = {
  id?: string;
  type?: string;
  role?: "assistant";
  model?: string;
  content: ContentBlock[];
  stop_reason?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

export type UserEchoMessage = {
  role?: "user";
  content: ContentBlock[];
};

// Raw event as it arrives on the `session://{id}/event` Tauri channel.
// Claude emits real stream-json payloads; the Rust side also injects a few
// synthetic frames (user_text, stderr, raw) to keep the chat model unified.
export type ClaudeEvent =
  | {
      type: "system";
      subtype?: string;
      session_id?: string;
      model?: string;
      [k: string]: unknown;
    }
  | {
      type: "assistant";
      message: AssistantMessage;
    }
  | {
      type: "user";
      message: UserEchoMessage;
    }
  | {
      type: "result";
      subtype?: string;
      duration_ms?: number;
      duration_api_ms?: number;
      cost_usd?: number;
      total_cost_usd?: number;
      num_turns?: number;
      session_id?: string;
      result?: string;
      usage?: Record<string, number>;
    }
  | { type: "user_text"; text: string }
  | { type: "stderr"; text: string }
  | { type: "raw"; text: string }
  | { type: string; [k: string]: unknown };

// Normalized entry rendered in the chat log.
export type ChatEntry =
  | { kind: "user"; ts: number; text: string }
  | {
      kind: "assistant";
      ts: number;
      text: string;
      model?: string;
      usage?: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
    }
  | {
      kind: "tool";
      ts: number;
      id: string;
      name: string;
      input: unknown;
      result?: string;
      isError?: boolean;
      // Optional per-turn metadata attached by the history parser so
      // seedEntries can recover usage for tool-use-only assistant turns
      // (no text block to hang the counters on).
      model?: string;
      usage?: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
    }
  | {
      kind: "result";
      ts: number;
      costUsd?: number;
      durationMs?: number;
      numTurns?: number;
    }
  | { kind: "system"; ts: number; text: string }
  | { kind: "error"; ts: number; text: string };
