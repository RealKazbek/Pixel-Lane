import type { CongestionLevel } from "../types/traffic-analysis";

/**
 * Domain-meaningful traffic-congestion colors -- one of the few places a
 * fixed color palette is justified (it's what the levels mean, not a UI
 * style choice). Matches the Traffic Engine's FREE_FLOW/MODERATE/HEAVY/
 * SATURATED classification (see docs/architecture.md).
 */
export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  FREE_FLOW: "#22c55e",
  MODERATE: "#eab308",
  HEAVY: "#f97316",
  SATURATED: "#ef4444",
};

export const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  FREE_FLOW: "Free flow",
  MODERATE: "Moderate",
  HEAVY: "Heavy",
  SATURATED: "Saturated",
};

export const NO_DATA_COLOR = "#94a3b8"; // neutral slate -- no analysis loaded yet

export function congestionColor(level: CongestionLevel | undefined): string {
  return level ? CONGESTION_COLORS[level] : NO_DATA_COLOR;
}
