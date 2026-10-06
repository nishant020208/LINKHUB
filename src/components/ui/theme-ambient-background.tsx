import React from "react";
import { CloudShader } from "./cloud-shader";
import { BlackHole } from "./black-hole";
import { RecursiveErosionBackground } from "./recursive-erosion";

export type ThemeAmbientBackgroundProps = {
  theme: "dark" | "light" | "aesthetic";
  deviceType: "desktop" | "mobile";
  reduce?: boolean;
  className?: string;
};

export const ThemeAmbientBackground: React.FC<ThemeAmbientBackgroundProps> = ({
  theme,
  deviceType,
  reduce = false,
  className = "",
}) => {
  // Mobile or reduced motion: Render zero-lag, battery-safe static backdrops.
  // This completely eliminates WebGL draw calls, shader compilation, and thermal throttling on mobile devices.
  if (deviceType === "mobile" || reduce) {
    if (theme === "light") {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(214, 232, 248, 0.55) 0%, rgba(243, 238, 230, 0.95) 75%)",
          }}
        >
          {/* Subtle warm paper horizon mist */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.7) 0%, transparent 45%), radial-gradient(circle at 20% 40%, rgba(243, 228, 200, 0.35) 0%, transparent 50%)",
            }}
          />
        </div>
      );
    }

    if (theme === "aesthetic") {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
          style={{
            background:
              "radial-gradient(ellipse 90% 65% at 50% 25%, rgba(157, 92, 252, 0.16) 0%, rgba(9, 10, 20, 0.98) 70%)",
          }}
        >
          {/* Subtle neon ultraviolet stardust nebula */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(circle at 75% 35%, rgba(157, 92, 252, 0.14) 0%, transparent 45%), radial-gradient(circle at 25% 65%, rgba(56, 189, 248, 0.08) 0%, transparent 45%)",
            }}
          />
        </div>
      );
    }

    // Default: Dark Mode static singularity backdrop
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
        style={{
          background:
            "radial-gradient(ellipse 90% 65% at 50% 30%, rgba(232, 165, 75, 0.12) 0%, rgba(12, 11, 10, 0.98) 70%)",
        }}
      >
        {/* Subtle amber gravitational glow */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, rgba(232, 165, 75, 0.15) 0%, rgba(61, 186, 139, 0.05) 40%, transparent 65%)",
          }}
        />
      </div>
    );
  }

  // Desktop active interactive shaders.
  // Strictly renders ONLY the currently active mode shader to ensure instant switching with zero residual GPU load.
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-opacity duration-700 ${className}`}
    >
      {theme === "light" && (
        <div key="shader-light" className="relative h-full w-full">
          <CloudShader
            className="h-full w-full opacity-35"
            cloudColor="#ffffff"
            skyTopColor="#d4e4f5"
            skyBottomColor="#f3eee6"
            speed={0.4}
            count={4}
          />
          {/* Subtle contrast gradient overlay to ensure WCAG AA text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(243, 238, 230, 0.25) 0%, rgba(243, 238, 230, 0.65) 100%)",
            }}
          />
        </div>
      )}

      {theme === "dark" && (
        <div key="shader-dark" className="relative h-full w-full">
          <BlackHole className="h-full w-full opacity-30" />
          {/* Contrast vignette overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(12, 11, 10, 0.75) 100%)",
            }}
          />
        </div>
      )}

      {theme === "aesthetic" && (
        <div key="shader-aesthetic" className="relative h-full w-full">
          <RecursiveErosionBackground
            mode="dark"
            className="h-full w-full opacity-35"
          />
          {/* Contrast vignette overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(9, 10, 20, 0.75) 100%)",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ThemeAmbientBackground;
