"use client";

import { useTranslations } from "next-intl";
import type { Intersection, Road } from "../types/city";
import {
  getLaneDirectionRelativeToIntersection,
  getRoadEndpointAtIntersection,
  type LaneRelativeDirection,
} from "../editor/intersectionLaneDirection";

interface IntersectionPropertiesPanelProps {
  intersection: Intersection;
  roads: Road[];
  onCornerRadiusChange: (radius: number) => void;
  onLaneDirectionChange: (
    roadId: string,
    laneId: string,
    direction: LaneRelativeDirection,
  ) => void;
  validationError?: string | null;
}

const DEFAULT_RADIUS_M = 6;

function approachBearings(intersection: Intersection, roads: Road[]): number[] {
  return roads.flatMap((road) => {
    const points = road.geometry.points;
    if (points.length < 2) return [];
    const atEnd =
      Math.hypot(
        points.at(-1)!.x - intersection.position.x,
        points.at(-1)!.y - intersection.position.y,
      ) <= 0.5;
    const adjacent = points[atEnd ? points.length - 2 : 1];
    const dx = adjacent.x - intersection.position.x;
    const dy = adjacent.y - intersection.position.y;
    return [Math.atan2(dx, -dy) * (180 / Math.PI)];
  });
}

function junctionType(
  intersection: Intersection,
  roads: Road[],
  t: (key: string) => string,
): string {
  const count = intersection.connected_road_ids.length;
  if (count === 4) return t("typeFourWay");
  if (count !== 3) return count > 4 ? t("typeMultiLeg") : t("typeGeneric");
  const bearings = approachBearings(intersection, roads);
  const hasStraightPair = bearings.some((bearing, index) =>
    bearings.slice(index + 1).some((other) => {
      const delta = Math.abs(((bearing - other + 540) % 360) - 180);
      return delta > 150;
    }),
  );
  return hasStraightPair ? t("typeT") : t("typeY");
}

export function IntersectionPropertiesPanel({
  intersection,
  roads,
  onCornerRadiusChange,
  onLaneDirectionChange,
  validationError,
}: IntersectionPropertiesPanelProps) {
  const t = useTranslations("cityModel.intersectionProperties");
  const connectedRoads = intersection.connected_road_ids
    .map((id) => roads.find((road) => road.id === id))
    .filter((road): road is Road => !!road);
  const radius = intersection.junction_corner_radius_m ?? DEFAULT_RADIUS_M;

  return (
    <section className="pointer-events-auto absolute right-3 top-16 z-20 max-h-[calc(100%-5rem)] w-60 overflow-y-auto rounded-lg border border-border-subtle bg-surface/95 p-3 text-xs text-foreground shadow-lg backdrop-blur">
      <h2 className="mb-3 text-sm font-semibold">{t("title")}</h2>
      <dl className="space-y-2">
        <div>
          <dt className="text-muted-foreground">{t("id")}</dt>
          <dd className="break-all font-mono">{intersection.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("type")}</dt>
          <dd>{junctionType(intersection, connectedRoads, t)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("connectedRoads")}</dt>
          <dd>{connectedRoads.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("approaches")}</dt>
          <dd>{connectedRoads.length}</dd>
        </div>
      </dl>
      <label className="mt-3 block">
        <span className="mb-1 block text-muted-foreground">
          {t("cornerRadius")}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1.5"
            max="12"
            step="0.5"
            value={radius}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next))
                onCornerRadiusChange(Math.min(12, Math.max(1.5, next)));
            }}
            className="w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("cornerRadius")}
          />
          <span className="text-muted-foreground">m</span>
        </div>
      </label>
      {validationError && (
        <p role="alert" className="mt-3 rounded border border-danger/40 bg-danger/10 p-2 text-danger">
          {validationError}
        </p>
      )}
      <div className="mt-3 border-t border-border-subtle pt-3">
        <h3 className="mb-2 text-muted-foreground">{t("connectedRoadList")}</h3>
        <div className="space-y-2">
          {connectedRoads.map((road) => {
            const endpoint = getRoadEndpointAtIntersection(road, intersection);
            return (
              <details key={road.id} open className="rounded border border-border-subtle p-2">
                <summary className="cursor-pointer font-medium">
                  <span>{road.name}</span>
                  <span className="ml-1 text-muted-foreground">
                    ({endpoint ? t("endpoint" + endpoint) : t("endpointUnknown")})
                  </span>
                </summary>
                <div className="mt-2 space-y-1.5">
                  {road.lanes.map((lane) => {
                    const direction = getLaneDirectionRelativeToIntersection(
                      road,
                      lane,
                      intersection,
                    );
                    return (
                      <div key={lane.id} className="rounded bg-background/60 p-1.5">
                        <div className="mb-1 text-[11px] text-muted-foreground">
                          {t("laneNumber", { number: lane.index + 1 })}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {(["INBOUND", "OUTBOUND"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              disabled={!endpoint}
                              aria-pressed={direction === option}
                              title={t("laneDirection." + option)}
                              onClick={() =>
                                onLaneDirectionChange(road.id, lane.id, option)
                              }
                              className={
                                "rounded border px-1 py-1 text-[10px] transition-colors " +
                                (direction === option
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border-subtle text-muted-foreground hover:bg-surface-elevated") +
                                " disabled:cursor-not-allowed disabled:opacity-50"
                              }
                            >
                              <span aria-hidden="true">
                                {option === "INBOUND" ? "↓" : "↑"}
                              </span>{" "}
                              {t("laneDirection." + option)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        {t("topologySummary", { id: intersection.id })}
      </p>
    </section>
  );
}
