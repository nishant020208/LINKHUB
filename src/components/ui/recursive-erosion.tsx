"use client";

import { useMemo, type CSSProperties } from "react";

import { recursiveErosionSource } from "./recursive-erosion-utils/recursive-erosion-source";

type FocusRole = "background" | "button" | "visual";
type EffectMode = "light" | "dark";

type FocusTarget = {
  selector: string;
  role: FocusRole;
};

type EffectDefinition = {
  title: string;
  source: string;
  background: string;
  targets: readonly FocusTarget[];
  theme?: {
    nativeMode?: EffectMode;
    lightBackground: string;
    darkBackground: string;
    invertBackground?: boolean;
  };
  hiddenTargets?: readonly string[];
};

export type RecursiveErosionBackgroundProps = {
  mode?: EffectMode;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

export const RECURSIVE_EROSION_DEFAULTS = {
  mode: "dark",
  hue: 0,
  saturation: 1,
  brightness: 1,
} as const;

const RECURSIVE_EROSION_EFFECT: EffectDefinition = {
  title: "Recursive Erosion particle sphere background",
  source: recursiveErosionSource,
  background: "#090a14",
  theme: {
    lightBackground: "#f4f3f1",
    darkBackground: "#090a14",
  },
  targets: [{ selector: "#stage", role: "background" }],
  hiddenTargets: ["#badge", ".sr"],
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function effectBackground(definition: EffectDefinition, mode: EffectMode) {
  return definition.theme?.[`${mode}Background`] ?? definition.background;
}

function buildFocusedDocument(definition: EffectDefinition, mode: EffectMode) {
  const background = effectBackground(definition, mode);
  const source = definition.source;
  const targetJson = JSON.stringify(definition.targets).replace(
    /</g,
    "\\u003c",
  );
  const hiddenTargetJson = JSON.stringify(
    definition.hiddenTargets ?? [],
  ).replace(/</g, "\\u003c");
  const modeJson = JSON.stringify(mode);
  const focusStyle = `<style data-threeui-focus>
html, body { width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: ${background} !important; color-scheme: ${mode} !important; }
body { position: relative !important; display: flex !important; align-items: center !important; justify-content: center !important; }
body > * { visibility: hidden !important; }
body[data-threeui-ready] > [data-threeui-role] { visibility: visible !important; }
[data-threeui-residual] { display: none !important; }
[data-threeui-hidden] { display: none !important; }
[data-threeui-role="background"] { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; z-index: 0 !important; opacity: 1 !important; pointer-events: none !important; }
[data-threeui-role="button"] { position: relative !important; z-index: 2 !important; opacity: 1 !important; flex: none !important; }
[data-threeui-role="visual"] { position: relative !important; z-index: 1 !important; width: min(100%, 1040px) !important; max-width: 1040px !important; max-height: 100% !important; margin: auto !important; padding: 24px !important; overflow: auto !important; opacity: 1 !important; filter: none !important; }
</style>`;
  const focusScript = `<script data-threeui-focus>
(function () {
  document.documentElement.dataset.sfMode = ${modeJson};
  var isolated = false;
  function isolate() {
    if (isolated) return;
    var specs = ${targetJson};
    var hiddenSelectors = ${hiddenTargetJson};
    var roots = [];
    hiddenSelectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        element.setAttribute('data-threeui-hidden', '');
        element.setAttribute('aria-hidden', 'true');
        if ('inert' in element) element.inert = true;
      });
    });
    specs.forEach(function (spec) {
      var element = document.querySelector(spec.selector);
      if (!element) return;
      element.setAttribute('data-threeui-role', spec.role);
      if (!roots.some(function (root) { return root.contains(element); })) roots.push(element);
    });
    if (!roots.length) return;
    isolated = true;
    roots.forEach(function (root) {
      var placeholderLink = root.matches('a[href="#"]') ? root : root.querySelector('a[href="#"]');
      if (placeholderLink) placeholderLink.addEventListener('click', function (event) { event.preventDefault(); });
      document.body.appendChild(root);
    });
    Array.from(document.body.children).forEach(function (element) {
      if (roots.indexOf(element) !== -1) return;
      element.setAttribute('data-threeui-residual', '');
      element.setAttribute('aria-hidden', 'true');
      if ('inert' in element) element.inert = true;
    });
    document.body.setAttribute('data-threeui-ready', '');
    requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
  }
  function scheduleIsolation() { setTimeout(isolate, 100); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleIsolation, { once: true });
  else scheduleIsolation();
  window.addEventListener('load', isolate, { once: true });
})();
</script>`;
  return source
    .replace(/<\/head>/i, `${focusStyle}</head>`)
    .replace(/<\/body>/i, `${focusScript}</body>`);
}

export function RecursiveErosionBackground({
  mode = RECURSIVE_EROSION_DEFAULTS.mode,
  hue = RECURSIVE_EROSION_DEFAULTS.hue,
  saturation = RECURSIVE_EROSION_DEFAULTS.saturation,
  brightness = RECURSIVE_EROSION_DEFAULTS.brightness,
  className,
  style,
}: RecursiveErosionBackgroundProps) {
  const safeMode: EffectMode = mode === "light" ? "light" : "dark";
  const background = effectBackground(RECURSIVE_EROSION_EFFECT, safeMode);
  const source = useMemo(
    () => buildFocusedDocument(RECURSIVE_EROSION_EFFECT, safeMode),
    [safeMode],
  );
  const safeHue = clamp(hue, -180, 180);
  const safeSaturation = clamp(saturation, 0, 2);
  const safeBrightness = clamp(brightness, 0.35, 1.65);
  const filter =
    safeHue === 0 && safeSaturation === 1 && safeBrightness === 1
      ? undefined
      : `hue-rotate(${safeHue}deg) saturate(${safeSaturation}) brightness(${safeBrightness})`;

  return (
    <iframe
      className={className}
      data-mode={safeMode}
      title={RECURSIVE_EROSION_EFFECT.title}
      srcDoc={source}
      sandbox="allow-scripts"
      loading="eager"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        border: 0,
        background,
        filter,
        ...style,
      }}
    />
  );
}

export default RecursiveErosionBackground;
