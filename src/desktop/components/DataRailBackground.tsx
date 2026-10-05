import React, { useMemo, useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

/**
 * Hook to pause background animations when tab is hidden, saving CPU/battery.
 */
function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return isVisible;
}

/**
 * DataRailBackground:
 * A subtle, elegant SVG circuit background representing data flowing between
 * actually-connected accounts. Capped strictly to the real accounts in use.
 *
 * Pauses automatically via Page Visibility API when the tab is in the background,
 * and renders as static subtle tracks under prefers-reduced-motion.
 */
export const DataRailBackground: React.FC = () => {
  const { accounts } = useAppStore();
  const reduce = useReducedMotion();
  const isVisible = usePageVisibility();

  // Active animation only when tab is visible and reduced-motion is not requested
  const shouldAnimate = isVisible && !reduce;

  // Generate nodes around canvas perimeter mapped strictly to actual connected accounts
  const nodes = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return [
        { id: 'local-1', label: 'Local Hub', color: '#e8a54b', x: 8, y: 18 },
        { id: 'local-2', label: 'Storage', color: '#9d5cfc', x: 92, y: 82 },
      ];
    }

    // Compute perimeter positions for up to 8 real accounts
    const total = accounts.length;
    return accounts.map((acc, idx) => {
      // Distribute along edges: left, top, right, bottom
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
      // In percentage of canvas, inset by 6% from boundary
      const cx = 50;
      const cy = 50;
      const rx = 44;
      const ry = 42;
      const x = Math.round(cx + rx * Math.cos(angle));
      const y = Math.round(cy + ry * Math.sin(angle));

      return {
        id: acc.id,
        label: acc.label || acc.provider,
        color: acc.color || '#e8a54b',
        x,
        y,
      };
    });
  }, [accounts]);

  // Compute conduits (connecting lines) between nodes
  const conduits = useMemo(() => {
    if (nodes.length <= 1) return [];
    const lines: { path: string; key: string }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const from = nodes[i];
      const to = nodes[(i + 1) % nodes.length];
      // Gentle bezier curved conduit between adjacent peripheral nodes
      const midX = (from.x + to.x) / 2 + (Math.random() > 0.5 ? 4 : -4);
      const midY = (from.y + to.y) / 2;
      lines.push({
        key: `conduit-${from.id}-${to.id}`,
        path: `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`,
      });
    }
    return lines;
  }, [nodes]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <svg
        className="w-full h-full opacity-35 transition-opacity duration-500"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Conduit Lines */}
        {conduits.map((c) => (
          <g key={c.key}>
            {/* Base hairline rail track */}
            <path
              d={c.path}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="0.12"
              strokeOpacity="0.18"
              strokeDasharray="0.8 1.2"
            />

            {/* Traveling data pulse */}
            {shouldAnimate && (
              <path
                d={c.path}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="0.3"
                strokeLinecap="round"
                strokeOpacity="0.85"
                filter="url(#glow)"
                strokeDasharray="2 18"
                className="animate-data-pulse"
                style={{
                  animation: 'dataPulseRail 14s linear infinite',
                }}
              />
            )}
          </g>
        ))}

        {/* Account Nodes */}
        {nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            {/* Ambient outer halo */}
            <circle
              r="1.2"
              fill={node.color}
              fillOpacity={shouldAnimate ? 0.12 : 0.08}
              className={shouldAnimate ? 'animate-pulse' : undefined}
            />
            {/* Core dot */}
            <circle
              r="0.4"
              fill={node.color}
              fillOpacity="0.9"
              filter="url(#glow)"
            />
          </g>
        ))}
      </svg>

      <style>{`
        @keyframes dataPulseRail {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -40;
          }
        }
      `}</style>
    </div>
  );
};
