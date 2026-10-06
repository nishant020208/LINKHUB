"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createRenderer } from "./black-hole-utils/renderer";

export type BlackHoleProps = {
  className?: string;
  children?: React.ReactNode;
};

export function Example({ className, children }: BlackHoleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createRenderer({ canvas });
    void renderer.ready;

    return () => renderer.dispose();
  }, []);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      {children ? (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export const BlackHole = Example;
export default Example;
