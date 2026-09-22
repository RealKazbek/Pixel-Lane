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
      className="pointer-events-auto relative h-[72px] w-[72px] cursor-pointer rounded-full border border-border-subtle bg-surface/95 text-foreground shadow-lg ring-4 ring-surface/50 backdrop-blur transition-colors hover:border-primary hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 72 72"
        className="h-full w-full transition-transform duration-150"
        style={{ transform: `rotate(${compassRoseRotation(bearing)}deg)` }}
      >
        <circle
          cx="36"
          cy="36"
          r="29"
          fill="none"
          className="stroke-border-subtle"
          strokeWidth="1.5"
        />
        <circle
          cx="36"
          cy="36"
          r="21"
          fill="none"
          className="stroke-border-subtle"
          strokeDasharray="1 5"
        />
        <g
          fill="currentColor"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontWeight="600"
          className="text-muted-foreground"
        >
          <text x="11" y="36">
            W
          </text>
          <text x="61" y="36">
            E
          </text>
          <text x="36" y="61">
            S
          </text>
        </g>
        <text
          x="36"
          y="11"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="800"
          fill="currentColor"
          className="text-danger"
        >
          N
        </text>
        <path d="M36 18 L44 40 L36 36 L28 40 Z" className="fill-danger" />
        <path
          d="M36 54 L29 36 L36 39 L43 36 Z"
          fill="currentColor"
          className="text-muted-foreground"
        />
        <path d="M36 18 L36 36 L28 40 Z" className="fill-foreground/15" />
        <circle
          cx="36"
          cy="36"
          r="4"
          className="fill-surface stroke-foreground"
          strokeWidth="1.5"
        />
        <circle cx="36" cy="36" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}
