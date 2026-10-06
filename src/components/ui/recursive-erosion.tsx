"use client";

import React, { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type RecursiveErosionBackgroundProps = {
  mode?: "light" | "dark";
  hue?: number;
  saturation?: number;
  brightness?: number;
  reduce?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
};

export const RECURSIVE_EROSION_DEFAULTS = {
  mode: "dark",
  hue: 0,
  saturation: 1,
  brightness: 1,
} as const;

interface Particle {
  origX: number;
  origY: number;
  origZ: number;
  size: number;
  hue: number;
}

interface RenderedParticle {
  sx: number;
  sy: number;
  z2: number;
  size: number;
  alpha: number;
  hue: number;
}

function simplexLike(x: number, y: number, z: number, t: number) {
  return (
    Math.sin(x * 2.5 + t * 0.8) *
    Math.cos(y * 2.5 + t * 0.7) *
    Math.sin(z * 2.5 + t * 0.9)
  );
}

export function RecursiveErosionBackground({
  mode = RECURSIVE_EROSION_DEFAULTS.mode,
  hue = RECURSIVE_EROSION_DEFAULTS.hue,
  saturation = RECURSIVE_EROSION_DEFAULTS.saturation,
  brightness = RECURSIVE_EROSION_DEFAULTS.brightness,
  reduce = false,
  className,
  style,
  children,
}: RecursiveErosionBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    // Generate spherical particles using golden ratio spiral
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 720;
    const phi = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      particles.push({
        origX: x,
        origY: y,
        origZ: z,
        size: Math.random() * 2.4 + 1.0,
        hue: 255 + (i % 65), // Ultraviolet to purple/neon magenta spectrum
      });
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      w = rect.width || window.innerWidth;
      h = rect.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    let angleY = 0;
    let angleX = 0.22;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;

      if (!reduce) {
        angleY += dt * 0.32;
        angleX = 0.22 + Math.sin(now * 0.0004) * 0.14;
      } else {
        angleY += dt * 0.05;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep void background
      ctx.fillStyle = mode === "light" ? "#f4f3f1" : "#090a14";
      ctx.fillRect(0, 0, w, h);

      const baseRadius = Math.min(w, h) * 0.38;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const t = now * 0.0008;

      // Ultraviolet center ambient nebular glow
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.08,
        cx,
        cy,
        baseRadius * 1.45,
      );
      if (mode === "light") {
        grad.addColorStop(0, "rgba(157, 92, 252, 0.15)");
        grad.addColorStop(0.5, "rgba(180, 83, 9, 0.05)");
        grad.addColorStop(1, "rgba(244, 243, 241, 0)");
      } else {
        grad.addColorStop(0, "rgba(157, 92, 252, 0.25)");
        grad.addColorStop(0.45, "rgba(110, 40, 230, 0.08)");
        grad.addColorStop(1, "rgba(9, 10, 20, 0)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const rendered: RenderedParticle[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Recursive erosion displacement
        const n1 = simplexLike(p.origX, p.origY, p.origZ, t);
        const n2 = simplexLike(p.origX * 2, p.origY * 2, p.origZ * 2, t * 1.5) * 0.5;
        const erosion = (n1 + n2) * 0.36;

        const r = 1 + erosion;
        const px = p.origX * r;
        const py = p.origY * r;
        const pz = p.origZ * r;

        // Rotate around Y
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;

        // Rotate around X
        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        // Perspective projection
        const fov = 750;
        const projZ = z2 * baseRadius + fov;
        if (projZ > 1) {
          const scale = fov / projZ;
          const sx = cx + x1 * baseRadius * scale;
          const sy = cy + y2 * baseRadius * scale;
          const alpha = Math.max(0.12, Math.min(0.96, (z2 + 1.2) * 0.48));

          rendered.push({
            sx,
            sy,
            z2,
            size: p.size * scale,
            alpha,
            hue: p.hue,
          });
        }
      }

      // Sort by Z depth (back to front)
      rendered.sort((a, b) => a.z2 - b.z2);

      // Render particles & connection filaments
      const effectiveSat = Math.max(0, Math.min(2, saturation)) * 85;
      const effectiveBright = Math.max(0.3, Math.min(1.8, brightness));

      for (let i = 0; i < rendered.length; i++) {
        const pt = rendered[i];
        const finalHue = (pt.hue + hue + 360) % 360;
        const finalAlpha = Math.min(1, pt.alpha * effectiveBright);

        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, Math.max(0.8, pt.size), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${finalHue}, ${effectiveSat}%, 68%, ${finalAlpha})`;
        ctx.fill();

        // Connecting filaments between adjacent particles in cluster
        if (i > 0 && i % 3 === 0) {
          const prev = rendered[i - 1];
          const dist = Math.hypot(pt.sx - prev.sx, pt.sy - prev.sy);
          if (dist < 52) {
            ctx.beginPath();
            ctx.moveTo(pt.sx, pt.sy);
            ctx.lineTo(prev.sx, prev.sy);
            ctx.strokeStyle = `hsla(${finalHue}, ${effectiveSat}%, 65%, ${finalAlpha * 0.22})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateSize);
    };
  }, [mode, hue, saturation, brightness, reduce]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden bg-[#090a14]", className)}
      style={style}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      {children ? (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default RecursiveErosionBackground;
