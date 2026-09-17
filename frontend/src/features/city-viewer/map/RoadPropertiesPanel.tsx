"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Road } from "../types/city";
import { roadWidthMeters } from "./styles/roadStyle";

export const MIN_EDITOR_ROAD_WIDTH_M = 2.5;
export const MAX_EDITOR_ROAD_WIDTH_M = 60;

interface RoadPropertiesPanelProps {
  road: Road;
  onChange: (changes: { name?: string; width_m?: number }) => void;
}

export function RoadPropertiesPanel({
  road,
  onChange,
}: RoadPropertiesPanelProps) {
  const t = useTranslations("cityModel.properties");
  const [name, setName] = useState(road.name);
  const [width, setWidth] = useState(
    String(road.width_m ?? roadWidthMeters(road)),
  );

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
        <span className="mb-1 block text-muted-foreground">{t("width")}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={MIN_EDITOR_ROAD_WIDTH_M}
            max={MAX_EDITOR_ROAD_WIDTH_M}
            step="0.1"
            value={width}
            onChange={(event) => {
              const value = event.target.value;
              setWidth(value);
              const parsed = Number(value);
              if (
                Number.isFinite(parsed) &&
                parsed >= MIN_EDITOR_ROAD_WIDTH_M &&
                parsed <= MAX_EDITOR_ROAD_WIDTH_M
              ) {
                onChange({ width_m: parsed });
              }
            }}
            onBlur={() => {
              const parsed = Number(width);
              if (
                !Number.isFinite(parsed) ||
                parsed < MIN_EDITOR_ROAD_WIDTH_M ||
                parsed > MAX_EDITOR_ROAD_WIDTH_M
              ) {
                setWidth(String(road.width_m ?? roadWidthMeters(road)));
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-border-subtle bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("width")}
          />
          <span className="text-muted-foreground">{t("meters")}</span>
        </div>
      </label>
    </section>
  );
}
