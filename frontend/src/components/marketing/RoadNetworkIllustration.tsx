/** Decorative city road-network illustration used in the marketing hero
 * and platform-preview sections. Inline SVG, not a photograph -- avoids
 * hotlinking/licensing external imagery while still being visually rich
 * and on-theme (see the task's imagery constraints). Purely decorative,
 * so it's hidden from assistive tech. */
export function RoadNetworkIllustration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <rect
        width="400"
        height="300"
        rx="16"
        fill="currentColor"
        opacity="0.04"
      />
      {[40, 110, 180, 250, 320].map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1="10"
          x2={x}
          y2="290"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="6"
        />
      ))}
      {[40, 100, 160, 220, 280].map((y) => (
        <line
          key={`h-${y}`}
          x1="10"
          y1={y}
          x2="390"
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="6"
        />
      ))}
      {[
        [40, 40],
        [180, 100],
        [320, 160],
        [110, 220],
        [250, 280],
        [180, 40],
        [40, 160],
      ].map(([cx, cy], i) => (
        <circle
          key={`n-${i}`}
          cx={cx}
          cy={cy}
          r={i === 2 ? 9 : 5}
          fill="currentColor"
          opacity={i === 2 ? 0.9 : 0.6}
        />
      ))}
      <path
        d="M40 40 L180 40 L180 100 L320 100 L320 160 L110 160 L110 220 L250 220 L250 280"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="2 6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
