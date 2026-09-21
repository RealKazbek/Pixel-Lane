"use client";

import { compassRoseRotation } from "./compass";

interface MapCompassProps {
  bearing: number;
  label: string;
  resetLabel: string;
  onReset: () => void;
}

export function MapCompass({
  bearing,
  label,
  resetLabel,
  onReset,
}: MapCompassProps) {
  return (
    <button
      type="button"
      aria-label={resetLabel}
      title={label}
      onClick={onReset}
      className="pointer-events-auto relative h-9 w-9 rounded-full border border-border-subtle bg-surface/90 text-[8px] font-semibold text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className="absolute inset-1 rounded-full border border-border-subtle/70 transition-transform duration-150"
        style={{ transform: `rotate(${compassRoseRotation(bearing)}deg)` }}
      >
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-danger">
          N
        </span>
        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-[85%] border-x-[3px] border-b-[8px] border-x-transparent border-b-danger" />
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
      </span>
    </button>
  );
}
