"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type {
  LaneBoundaryMarking,
  LaneDirection,
  Road,
  RoadEdgeMarking,
} from "../types/city";
import {
  laneWidthMeters,
  resizeBoundaryMarkings,
  MAX_EDITOR_LANE_COUNT,
  MAX_EDITOR_ROAD_WIDTH_M,
  MIN_EDITOR_LANE_COUNT,
  MIN_EDITOR_LANE_WIDTH_M,
  MAX_EDITOR_LANE_WIDTH_M,
} from "../editor/laneConfiguration";

export const MIN_EDITOR_ROAD_WIDTH_M = 2.5;

interface RoadPropertiesPanelProps {
  road: Road;
  onChange: (changes: {
    name?: string;
    width_m?: number;
    lane_count?: number;
    lane_width_m?: number;
    lane_directions?: LaneDirection[];
    left_edge_marking?: RoadEdgeMarking;
    right_edge_marking?: RoadEdgeMarking;
    lane_boundary_markings?: LaneBoundaryMarking[];
  }) => void;
}

export function RoadPropertiesPanel({
  road,
  onChange,
}: RoadPropertiesPanelProps) {
  const t = useTranslations("cityModel.properties");
  const [name, setName] = useState(road.name);
  const laneCount = Math.max(MIN_EDITOR_LANE_COUNT, road.lanes.length);
  const laneWidth = laneWidthMeters(road);
  const width = road.width_m ?? laneCount * laneWidth;
  const directions: LaneDirection[] = Array.from(
    { length: laneCount },
    (_, index) => road.lanes[index]?.direction ?? "FORWARD",
  );
  const boundaryMarkings =
    road.lane_boundary_markings?.length === laneCount - 1
      ? road.lane_boundary_markings
      : directions
          .slice(0, -1)
          .map((direction, index) =>
            direction === directions[index + 1]
              ? "DASHED_WHITE"
              : "DOUBLE_SOLID_WHITE",
          );
  const edgeOptions: RoadEdgeMarking[] = [
    "SOLID_YELLOW",
    "SOLID_WHITE",
    "NONE",
  ];
  const boundaryOptions: LaneBoundaryMarking[] = [
    "DASHED_WHITE",
    "SOLID_WHITE",
    "DOUBLE_SOLID_WHITE",
    "NONE",
  ];
  const updateLaneModel = (
    count: number,
    widthM: number,
    nextDirections = directions,
  ) => {
    if (count * widthM > MAX_EDITOR_ROAD_WIDTH_M) return;
    onChange({
      lane_count: count,
      lane_width_m: widthM,
      width_m: count * widthM,
      lane_directions: nextDirections.slice(0, count),
      lane_boundary_markings: resizeBoundaryMarkings(road, count),
    });
  };

  return (
    <section className="pointer-events-auto absolute right-3 top-16 z-20 w-56 rounded-lg border border-border-subtle bg-surface/95 p-3 text-xs text-foreground shadow-lg backdrop-blur">
      <h2 className="mb-3 text-sm font-semibold">{t("title")}</h2>
      <label className="block">
        <span className="mb-1 block text-muted-foreground">{t("street")}</span>
        <input
          value={name}
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            if (value.trim()) onChange({ name: value });
          }}
          onBlur={() => {
            if (!name.trim()) setName(road.name);
          }}
          className="w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t("street")}
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-muted-foreground">{t("lanes")}</span>
        <input
          type="number"
          min="1"
          max={MAX_EDITOR_LANE_COUNT}
          step="1"
          value={laneCount}
          onChange={(event) => {
            const count = Number(event.target.value);
            if (
              Number.isInteger(count) &&
              count >= MIN_EDITOR_LANE_COUNT &&
              count <= MAX_EDITOR_LANE_COUNT
            ) {
              updateLaneModel(count, laneWidth);
            }
          }}
          className="w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t("lanes")}
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-muted-foreground">
          {t("laneWidth")}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={MIN_EDITOR_LANE_WIDTH_M}
            max={MAX_EDITOR_LANE_WIDTH_M}
            step="0.1"
            value={laneWidth}
            onChange={(event) => {
              const value = event.target.value;
              const parsed = Number(value);
              if (Number.isFinite(parsed) && parsed >= 2.5 && parsed <= 6) {
                updateLaneModel(laneCount, parsed);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-border-subtle bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("laneWidth")}
          />
          <span className="text-muted-foreground">{t("meters")}</span>
        </div>
      </label>
      <fieldset className="mt-3">
        <legend className="mb-1 text-muted-foreground">
          {t("directions")}
        </legend>
        <div className="space-y-1">
          {directions.map((direction, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                const next = [...directions];
                next[index] = direction === "FORWARD" ? "BACKWARD" : "FORWARD";
                updateLaneModel(laneCount, laneWidth, next);
              }}
              className="flex w-full items-center justify-between rounded border border-border-subtle px-2 py-1 hover:bg-surface-elevated"
            >
              <span>{t("laneNumber", { number: index + 1 })}</span>
              <span aria-label={direction}>
                {direction === "FORWARD" ? "→" : "←"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="mb-1 text-muted-foreground">{t("markings")}</legend>
        {(["left_edge_marking", "right_edge_marking"] as const).map((side) => (
          <label
            className="mt-2 flex items-center justify-between gap-2"
            key={side}
          >
            <span>
              {side === "left_edge_marking" ? t("leftEdge") : t("rightEdge")}
            </span>
            <select
              value={road[side] ?? "SOLID_YELLOW"}
              onChange={(event) =>
                onChange({ [side]: event.target.value as RoadEdgeMarking })
              }
              className="min-w-0 rounded border border-border-subtle bg-background px-1 py-1 text-foreground"
            >
              {edgeOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`marking.${option}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
        {boundaryMarkings.map((marking, index) => (
          <label
            className="mt-2 flex items-center justify-between gap-2"
            key={index}
          >
            <span>{t("lanePair", { left: index + 1, right: index + 2 })}</span>
            <select
              value={marking}
              onChange={(event) => {
                const next = [...boundaryMarkings];
                next[index] = event.target.value as LaneBoundaryMarking;
                onChange({ lane_boundary_markings: next });
              }}
              className="min-w-0 rounded border border-border-subtle bg-background px-1 py-1 text-foreground"
            >
              {boundaryOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`marking.${option}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      <label className="mt-3 block">
        <span className="mb-1 block text-muted-foreground">{t("width")}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={MIN_EDITOR_ROAD_WIDTH_M}
            max={MAX_EDITOR_ROAD_WIDTH_M}
            step="0.1"
            value={width.toFixed(1)}
            readOnly
            className="min-w-0 flex-1 rounded-md border border-border-subtle bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("width")}
          />
          <span className="text-muted-foreground">{t("meters")}</span>
        </div>
      </label>
    </section>
  );
}
