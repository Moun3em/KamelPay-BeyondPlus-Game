"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * FiveCorners — the KamelPay routing constellation.
 *
 * The five-corner route rendered as an ambient SVG: C1 SUPPLIER (red) →
 * C3 SUPPLIER ASP (green) → C5 FTA (violet) → C4 BUYER ASP (orange) →
 * C2 BUYER (blue) → back to C1. The same diagram that lives on the printed
 * mats and reference sheets — the platform and the physical table speak one
 * visual language.
 *
 * Motion is decorative only (aria-hidden). Slow drift via CSS
 * (transform-only), one-shot pulse via SMIL when `pulseKey` changes.
 * Everything respects prefers-reduced-motion and the global motion-paused
 * guard (layout.tsx).
 */

const NODES = [
  { id: "C1", label: "SUPPLIER", x: 140, y: 130, color: "#E5484D" },
  { id: "C3", label: "SUPPLIER ASP", x: 400, y: 100, color: "#1E8E5A" },
  { id: "C5", label: "FTA", x: 650, y: 250, color: "#8B5CF6" },
  { id: "C4", label: "BUYER ASP", x: 420, y: 395, color: "#F07A00" },
  { id: "C2", label: "BUYER", x: 150, y: 385, color: "#1A7AE5" },
];

const RING_PATH = "M140,130 L400,100 L650,250 L420,395 L150,385 Z";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function FiveCorners({
  pulseKey = 0,
  className = "",
  drifting = true,
}: {
  /** Increment to fire a one-shot pulse travelling the ring (scan moment). */
  pulseKey?: number;
  className?: string;
  drifting?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const arrowId = useId();
  const showPulse = pulseKey > 0 && !reduced;

  return (
    <svg
      viewBox="0 0 800 500"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.30)" />
        </marker>
      </defs>

      <g className={drifting && !reduced ? "kp-drift" : undefined}>
        {/* Ring edges */}
        <g
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="2"
          fill="none"
          markerEnd={`url(#${arrowId})`}
        >
          <path d="M140,130 L400,100" />
          <path d="M400,100 L650,250" />
          <path d="M650,250 L420,395" />
          <path d="M420,395 L150,385" />
          <path d="M150,385 L140,130" />
        </g>

        {/* Nodes */}
        {NODES.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={46} fill={n.color} opacity={0.12} />
            <circle cx={n.x} cy={n.y} r={34} fill={n.color} />
            <text
              x={n.x}
              y={n.y + 10}
              textAnchor="middle"
              fontSize="28"
              fontWeight="800"
              fill="#FFFFFF"
              style={{ fontFamily: "var(--font-outfit), Outfit, sans-serif" }}
            >
              {n.id.slice(1)}
            </text>
            <text
              x={n.x}
              y={n.y + 56}
              textAnchor="middle"
              fontSize="15"
              fontWeight="600"
              letterSpacing="0.12em"
              fill="rgba(255,255,255,0.72)"
              style={{ fontFamily: "var(--font-mono-plex), monospace" }}
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* One-shot pulse: remounts per pulseKey, travels the ring once */}
        {showPulse ? (
          <g key={pulseKey}>
            <g className="kp-glow">
              <circle r={16} fill="#FFFFFF" opacity={0.35}>
                <animateMotion dur="3.2s" repeatCount="1" path={RING_PATH} />
              </circle>
            </g>
            <circle r={7} fill="#FFFFFF">
              <animateMotion dur="3.2s" repeatCount="1" path={RING_PATH} />
            </circle>
          </g>
        ) : null}
      </g>
    </svg>
  );
}
