import type { TrafficLevel } from "@/components/ui/TrafficLevelBadge";
import type { CongestionLevel } from "../types/traffic-analysis";
import type { BottleneckSeverity } from "../types/traffic-analysis";

/** Maps the backend's congestion enum onto the app-wide semantic scale
 * used by `TrafficLevelBadge`. Domain-specific, so it lives here rather
 * than in the generic ui component. */
export function congestionToTrafficLevel(level: CongestionLevel): TrafficLevel {
  switch (level) {
    case "FREE_FLOW":
      return "low";
    case "MODERATE":
      return "moderate";
    case "HEAVY":
      return "high";
    case "SATURATED":
      return "critical";
  }
}

export function bottleneckSeverityToTrafficLevel(
  severity: BottleneckSeverity,
): TrafficLevel {
  return severity === "high" ? "critical" : "high";
}
