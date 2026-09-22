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
      className="pointer-events-auto relative h-14 w-14 rounded-full border border-border-subtle bg-surface/95 text-[11px] font-semibold text-muted-foreground shadow-md backdrop-blur transition-colors hover:border-primary/60 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        aria-hidden="true"
        className="absolute inset-1.5 rounded-full border border-border-subtle/80 transition-transform duration-150"
        style={{ transform: `rotate(${compassRoseRotation(bearing)}deg)` }}
      >
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-danger">
          N
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">
          S
        </span>
        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-[92%] border-x-[5px] border-b-[15px] border-x-transparent border-b-danger" />
        <span className="absolute left-1/2 top-1/2 h-0 w-0 translate-x-[-50%] translate-y-[-4%] border-x-[5px] border-t-[12px] border-x-transparent border-t-muted-foreground/70" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-foreground shadow-sm" />
      </span>
    </button>
  );
}
