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
  // Mobile: Render zero-lag, clean and simple static backdrops.
  // Perfectly legible, high-contrast, zero-flicker, and zero GPU overhead.
  if (deviceType === "mobile") {
    if (theme === "light") {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
          style={{
            background:
              "linear-gradient(180deg, #fcfbf9 0%, #f4ede2 100%)",
          }}
        >
          {/* Crisp, clean, simple warm paper subtle top horizon glow — no discolored blue/brown blotches */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(255, 255, 255, 0.9) 0%, transparent 75%)",
            }}
          />
        </div>
      );
    }

    if (theme === "aesthetic") {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
          style={{
            background:
              "linear-gradient(180deg, #0e0f1e 0%, #090a14 100%)",
          }}
        >
          {/* Subtle neon ultraviolet stardust nebula */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 50% 20%, rgba(157, 92, 252, 0.15) 0%, transparent 65%)",
            }}
          />
        </div>
      );
    }

    // Default: Dark Mode clean simple backdrop
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
        style={{
          background:
            "linear-gradient(180deg, #13110f 0%, #0c0b0a 100%)",
        }}
      >
        {/* Subtle amber gravitational glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 50% 25%, rgba(232, 165, 75, 0.12) 0%, transparent 65%)",
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
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ${className}`}
    >
      {theme === "light" && (
        <div key="shader-light" className="relative h-full w-full">
          <CloudShader
            className="h-full w-full opacity-90"
            cloudColor="#ffffff"
            skyTopColor="#3876ba"
            skyBottomColor="#8cbfe8"
            speed={reduce ? 0.05 : 0.4}
            count={5}
          />
          {/* Subtle contrast gradient overlay to ensure WCAG AA text legibility over clouds */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(243, 238, 230, 0.15) 0%, rgba(243, 238, 230, 0.45) 100%)",
            }}
          />
        </div>
      )}

      {theme === "dark" && (
        <div key="shader-dark" className="relative h-full w-full">
          <BlackHole className="h-full w-full opacity-85" />
          {/* Contrast vignette overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(12, 11, 10, 0.65) 100%)",
            }}
          />
        </div>
      )}

      {theme === "aesthetic" && (
        <div key="shader-aesthetic" className="relative h-full w-full">
          <RecursiveErosionBackground
            mode="dark"
            reduce={reduce}
            className="h-full w-full opacity-95"
          />
          {/* Subtle edge vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(9, 10, 20, 0.45) 100%)",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ThemeAmbientBackground;
