"use client";

import { useRef, useState, type PointerEvent } from "react";
import { compassRoseRotation } from "./compass";

interface MapCompassProps {
  bearing: number;
  label: string;
  resetLabel: string;
  onReset: () => void;
  onRotate: (bearing: number) => void;
}

export function MapCompass({
  bearing,
  label,
  resetLabel,
  onReset,
  onRotate,
}: MapCompassProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{
    pointerId: number;
    x: number;
    y: number;
    lastAngle: number;
    totalAngle: number;
    startBearing: number;
    dragging: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  const angleAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current!.getBoundingClientRect();
    return (
      (Math.atan2(
        event.clientX - (rect.left + rect.width / 2),
        -(event.clientY - (rect.top + rect.height / 2)),
      ) *
        180) /
      Math.PI
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastAngle: angleAt(event),
      totalAngle: 0,
      startBearing: bearing,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const angle = angleAt(event);
    if (!current.dragging) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5)
        return;
      current.dragging = true;
      setDragging(true);
    }
    const delta = ((angle - current.lastAngle + 540) % 360) - 180;
    current.totalAngle += delta;
    current.lastAngle = angle;
    onRotate(current.startBearing + current.totalAngle);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    suppressClick.current = current.dragging;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    requestAnimationFrame(() => {
      suppressClick.current = false;
    });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={resetLabel}
      title={label}
      onClick={() => {
        if (!suppressClick.current) onReset();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="pointer-events-auto relative h-[72px] w-[72px] cursor-grab rounded-full border border-border-subtle bg-surface/95 text-foreground shadow-lg ring-4 ring-surface/50 backdrop-blur transition-colors hover:border-primary hover:bg-surface-elevated active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ touchAction: "none" }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 72 72"
        className={`h-full w-full ${dragging ? "" : "transition-transform duration-150"}`}
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
