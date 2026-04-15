// Shared per-session stats computation used by both the ChatView header
// ring and the sidebar UsagePanel "Live sessions" card. Keeping the
// formula in one place means the two displays can never drift: they
// look at the same SessionUsage object and run it through the same
// function. Any derived value is in the returned struct.

import type { SessionInfo } from "./types";
import type { SessionUsage } from "@/stores/sessionStore";
import type { LongContextScope } from "@/stores/preferencesStore";

import { estimateTokens, modelFamily, resolvePricing } from "./pricing";

export type SessionStats = {
  // Cumulative tokens across every turn (what the API bills).
  inT: number;
  outT: number;
  cumulativeCostUsd: number;
  // Current conversation context size on the last assistant turn — the
  // value the ring should render against the resolved window.
  ctxUsed: number;
  // Resolved context window for this session: reported > preference >
  // observation > pricing table.
  ctxTotal: number;
  // Whichever exact model string we have: user-picked dropdown alias
  // or the one claude echoed back.
  effectiveModel: string | null;
};

export function computeSessionStats(
  usage: SessionUsage | null | undefined,
  session: Pick<SessionInfo, "model">,
  longContextScope: LongContextScope,
): SessionStats {
  const effectiveModel = session.model ?? usage?.detectedModel ?? null;
  const pricing = resolvePricing(effectiveModel);

  // Cumulative in/out, with a byte-estimate fallback for sessions that
  // haven't had a real usage frame yet. bytesOut is the user's outbound
  // text (→ input tokens); bytesIn is claude's reply bytes (→ output
  // tokens). Don't swap these, even though the naming is historical.
  const hasReal = !!usage && (usage.inputTokens > 0 || usage.outputTokens > 0);
  const inT = hasReal
    ? usage!.inputTokens
    : usage
      ? estimateTokens(usage.bytesOut)
      : 0;
  const outT = hasReal
    ? usage!.outputTokens
    : usage
      ? estimateTokens(usage.bytesIn)
      : 0;

  // Ring stays at 0 until a real assistant turn lands — any byte-based
  // estimate would be plotted against a guessed window and mislead.
  const ctxUsed = usage?.currentContextTokens ?? 0;

  // Window resolution order: authoritative report → user preference by
  // family → observed high-water mark → pricing table default.
  const reported = usage?.reportedContextWindow;
  let ctxTotal: number;
  if (reported && reported > 0) {
    ctxTotal = reported;
  } else {
    const maxSeen = usage?.maxObservedContextTokens ?? 0;
    const family = modelFamily(effectiveModel);
    const familyHas1m =
      family === "opus"
        ? longContextScope === "opus" || longContextScope === "opus-sonnet"
        : family === "sonnet"
          ? longContextScope === "opus-sonnet"
          : false;
    const observed1m = maxSeen > pricing.contextWindow * 0.95;
    const needs1m = familyHas1m || observed1m;
    ctxTotal =
      needs1m && pricing.contextWindow < 1_000_000
        ? 1_000_000
        : pricing.contextWindow;
  }

  return {
    inT,
    outT,
    cumulativeCostUsd: usage?.totalCostUsd ?? 0,
    ctxUsed,
    ctxTotal,
    effectiveModel,
  };
}
