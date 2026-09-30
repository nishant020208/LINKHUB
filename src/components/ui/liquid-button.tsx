import React, { useCallback, useRef } from 'react';
import { motion, type HTMLMotionProps, useMotionValue, useMotionTemplate, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface LiquidButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
}

/** Deterministic floating-particle field (6 motes). Rendered only when motion is allowed. */
const PARTICLES = [
  { x: 8, y: 78, dx: 14, dy: -26, delay: 0, duration: 6.5, opacity: 0.65 },
  { x: 22, y: 30, dx: 10, dy: -20, delay: 1.8, duration: 7.5, opacity: 0.5 },
  { x: 42, y: 88, dx: -8, dy: -30, delay: 3.1, duration: 6.0, opacity: 0.55 },
  { x: 63, y: 24, dx: 12, dy: -18, delay: 0.9, duration: 8.0, opacity: 0.45 },
  { x: 80, y: 70, dx: -14, dy: -28, delay: 2.4, duration: 6.8, opacity: 0.6 },
  { x: 92, y: 38, dx: -10, dy: -22, delay: 4.3, duration: 7.2, opacity: 0.5 },
] as const;

/**
 * LiquidChromeButton — a refractive, glass-like button with:
 *  - a spectral / iridescent conic ring on hover (anchored to the active theme's primary color)
 *  - a soft glowing center
 *  - a pointer-following light-scratch / shine highlight (CSS custom props driven, zero re-renders)
 *
 * All colors derive from existing design tokens (`var(--primary)`, `var(--ambient-*)`),
 * so it automatically adapts to the dark / light / aesthetic themes.
 *
 * Performance: uses layered gradients + `backdrop-filter` — no SVG displacement filters,
 * no WebGL. Pointer tracking writes CSS custom properties inside a rAF loop.
 * `prefers-reduced-motion` freezes the ring rotation, particles, and shine — the glass
 * surface and glow remain visible as a static, still-rich version.
 */
export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, children, disabled, onMouseMove, onMouseLeave, onPointerDown, onPointerUp, ...props }, ref) => {
    const reduce = useReducedMotion();
    const frameRef = useRef<number | null>(null);
    const surfaceRef = useRef<HTMLSpanElement | null>(null);

    // Pointer-tracked shine position as motion values → templated gradient, no React re-render.
    const mx = useMotionValue(50);
    const my = useMotionValue(50);
    const shine = useMotionTemplate`radial-gradient(140px circle at ${mx}% ${my}%, rgba(255,255,255,0.35), rgba(255,255,255,0.06) 45%, transparent 70%)`;

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseMove?.(e);
        if (reduce) return;
        const el = e.currentTarget;
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          const rect = el.getBoundingClientRect();
          mx.set(((e.clientX - rect.left) / rect.width) * 100);
          my.set(((e.clientY - rect.top) / rect.height) * 100);
        });
      },
      [mx, my, reduce, onMouseMove]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseLeave?.(e);
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      },
      [onMouseLeave]
    );

    // Slight press-parallax: nudge shine toward pointer on press for a "dragging light" feel.
    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLButtonElement>) => {
        onPointerDown?.(e);
        surfaceRef.current?.style.setProperty('--liquid-press', '1');
      },
      [onPointerDown]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent<HTMLButtonElement>) => {
        onPointerUp?.(e);
        surfaceRef.current?.style.setProperty('--liquid-press', '0');
      },
      [onPointerUp]
    );

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
        whileHover={reduce || disabled ? undefined : { y: -1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        className={cn(
          'liquid-btn group relative w-full min-h-[48px] py-3 px-4 rounded-2xl',
          'font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 cursor-pointer',
          'disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className
        )}
        {...props}
      >
        {/* Iridescent conic ring + soft glowing center (pseudo-layers live in index.css) */}
        <span ref={surfaceRef} className="liquid-btn-surface" aria-hidden />
        {/* Pointer-following light scratch / shine */}
        {!reduce && <motion.span className="liquid-btn-shine" aria-hidden style={{ backgroundImage: shine }} />}
        {/* Floating particles — CSS keyframe drift, mount only on fine pointers with motion */}
        {!reduce && (
          <span className="liquid-particles" aria-hidden>
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                className="liquid-particle"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  ['--particle-dx' as string]: `${p.dx}px`,
                  ['--particle-dy' as string]: `${p.dy}px`,
                  ['--particle-peak-opacity' as string]: p.opacity,
                }}
              />
            ))}
          </span>
        )}
        {/* Content layer above effects */}
        <span className="liquid-btn-content relative z-10 flex w-full items-center justify-center gap-3">
          {children}
        </span>
      </motion.button>
    );
  }
);
LiquidButton.displayName = 'LiquidButton';
