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
      className="pointer-events-auto relative h-11 w-11 rounded-md border border-border-subtle bg-surface/90 text-[9px] font-semibold text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className="absolute inset-1 transition-transform duration-150"
        style={{ transform: `rotate(${compassRoseRotation(bearing)}deg)` }}
      >
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-danger">
          N
        </span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2">S</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2">W</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">E</span>
        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-[85%] border-x-[4px] border-b-[9px] border-x-transparent border-b-danger" />
      </span>
    </button>
  );
}
