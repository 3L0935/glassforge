// Rough budget presets for Claude plans. Anthropic doesn't publish exact
// numbers — these are best-effort guesses so the usage bars can show a %.
// Users can pick "Custom" and tune in future versions; for v0.1 we ship
// the presets as-is.

export type PlanId = "pro" | "max5" | "max20" | "custom";

export type Plan = {
  id: PlanId;
  label: string;
  fiveHourTokens: number;
  weeklyTokens: number | null;
};

export const PLANS: Record<PlanId, Plan> = {
  pro: {
    id: "pro",
    label: "Pro ($20)",
    fiveHourTokens: 500_000,
    weeklyTokens: null,
  },
  max5: {
    id: "max5",
    label: "Max 5× ($100)",
    fiveHourTokens: 2_500_000,
    weeklyTokens: 15_000_000,
  },
  max20: {
    id: "max20",
    label: "Max 20× ($200)",
    fiveHourTokens: 10_000_000,
    weeklyTokens: 60_000_000,
  },
  custom: {
    id: "custom",
    label: "Custom",
    fiveHourTokens: 1_000_000,
    weeklyTokens: 10_000_000,
  },
};

export const PLAN_LIST: Plan[] = [
  PLANS.pro,
  PLANS.max5,
  PLANS.max20,
  PLANS.custom,
];

const STORAGE_KEY = "glassforge.plan";
const DEFAULT_PLAN: PlanId = "max5";

export function loadPlan(): PlanId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "pro" || v === "max5" || v === "max20" || v === "custom") {
      return v;
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_PLAN;
}

export function savePlan(id: PlanId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage not available
  }
}

export function resolvePlan(id: PlanId): Plan {
  return PLANS[id] ?? PLANS[DEFAULT_PLAN];
}
