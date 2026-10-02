/**
 * Zero-dependency PWA icon generator.
 *
 * Rasterizes the UnifyHub mark (a vector description of public/favicon.svg) into
 * the exact PNG set that browsers require for home-screen installability:
 *
 *   icon-192.png            192x192  manifest "any" purpose
 *   icon-512.png            512x512  manifest "any" purpose
 *   icon-maskable-512.png   512x512  manifest "maskable" purpose (Android adaptive)
 *   apple-touch-icon.png    180x180  iOS home screen (iOS applies its own mask)
 *
 * Why not an image library: this runs in `prebuild` on every deploy, so it must
 * stay fast, dependency-free and byte-for-byte reproducible. A hand-rolled
 * supersampled SDF rasterizer plus zlib (already in Node) covers it.
 *
 * Geometry differences per target, and why:
 *   - "any" icons: rounded tile with the hairline border, exactly like the favicon.
 *   - maskable: full-bleed background (Android crops to circle/squircle/etc.) and
 *     the logo pulled into the inner 80% safe zone, so no launcher shape clips it.
 *   - apple-touch-icon: full-bleed background with no rounded corners, because
 *     iOS *ignores* corner radius and squircle-masks the PNG itself. Shipping
 *     pre-rounded corners here produces a visible "double rounded" edge.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public/icons');

/** Palette lifted from favicon.svg and the app's theme tokens. */
const COLOR = {
  bg: [0x0c, 0x0b, 0x0a],
  border: [0x2e, 0x29, 0x23],
  ring: [0xe8, 0xa5, 0x4b],
  nodeWarm: [0xf0, 0xb8, 0x5c],
  nodeGreen: [0x3d, 0xba, 0x8b],
  ink: [0xf4, 0xef, 0xe6],
};

/** The design is authored in a 32x32 box, matching the favicon's viewBox. */
const DESIGN = 32;

/* ------------------------------------------------------------------ *
 * PNG encoding
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

/** Encode straight (non-premultiplied) RGBA bytes as a color-type-6 PNG. */
function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // One filter byte (0 = None) per scanline; zlib does the actual compression.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Signed distance helpers (all in design units)
 * ------------------------------------------------------------------ */

function sdRoundedRect(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - (halfW - radius);
  const qy = Math.abs(py - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

/** Distance from a point to a segment, used for round-capped strokes. */
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay;
  const h = denom === 0 ? 0 : Math.min(1, Math.max(0, (pax * bax + pay * bay) / denom));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/** `src` over `dst`, both [r,g,b,a] with alpha in 0..1. */
function over(dst, src) {
  const a = src[3] + dst[3] * (1 - src[3]);
  if (a === 0) return [0, 0, 0, 0];
  return [
    (src[0] * src[3] + dst[0] * dst[3] * (1 - src[3])) / a,
    (src[1] * src[3] + dst[1] * dst[3] * (1 - src[3])) / a,
    (src[2] * src[3] + dst[2] * dst[3] * (1 - src[3])) / a,
    a,
  ];
}

const solid = ([r, g, b], a = 1) => [r, g, b, a];

/* ------------------------------------------------------------------ *
 * The mark
 * ------------------------------------------------------------------ */

/**
 * Paint one supersample. Layers are composited in the same order as the SVG's
 * paint order so the PNG is visually indistinguishable from the favicon.
 */
function sample(px, py, opts) {
  const { bleed, contentScale, border } = opts;

  // Background: opaque full-bleed square, or the rounded tile.
  let color = bleed ? solid(COLOR.bg) : [0, 0, 0, 0];
  if (!bleed) {
    if (sdRoundedRect(px, py, DESIGN / 2, DESIGN / 2, DESIGN / 2, DESIGN / 2, 8) > 0) return [0, 0, 0, 0];
    color = solid(COLOR.bg);
  }

  // Hairline inner border (favicon only — maskable/bleed variants drop it so the
  // launcher mask never shows a second, hard-coded edge line).
  if (border && Math.abs(sdRoundedRect(px, py, DESIGN / 2, DESIGN / 2, DESIGN / 2 - 0.5, DESIGN / 2 - 0.5, 7.5)) <= 0.5) {
    color = over(color, solid(COLOR.border));
  }

  // Hub ring.
  if (Math.abs(sdCircle(px, py, 16, 16, 6)) <= 1.25) color = over(color, solid(COLOR.ring));

  // Connector lines, drawn under the nodes so the nodes stay crisp.
  if (sdSegment(px, py, 12, 12.5, 14.5, 14.5) <= 0.75) color = over(color, solid(COLOR.ink));
  if (sdSegment(px, py, 20, 12.5, 17.5, 14.5) <= 0.75) color = over(color, solid(COLOR.ink));
  if (sdSegment(px, py, 16, 20.5, 16, 18.5) <= 0.75) color = over(color, solid(COLOR.ink));

  // Nodes.
  if (sdCircle(px, py, 10, 11, 2.5) <= 0) color = over(color, solid(COLOR.nodeWarm));
  if (sdCircle(px, py, 22, 11, 2.5) <= 0) color = over(color, solid(COLOR.nodeGreen));
  if (sdCircle(px, py, 16, 23, 2.5) <= 0) color = over(color, solid(COLOR.ring));

  return color;
}

/**
 * Rasterize the mark at `size`x`size`.
 * `contentScale` shrinks the artwork relative to the tile: 1 for the favicon
 * look, <1 to pull the logo inside the maskable safe zone.
 */
function renderIcon({ size, bleed, contentScale, border, supersample = 4 }) {
  const rgba = Buffer.alloc(size * size * 4);
  const step = 1 / supersample;
  const offset = step / 2;

  // Map pixel space -> design space, scaling the artwork about the mark's center.
  const centerOffset = DESIGN / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < supersample; sy++) {
        for (let sx = 0; sx < supersample; sx++) {
          // Background geometry always fills the full tile; only the artwork scales.
          const bx = (x + sx * step + offset) / (size / DESIGN);
          const by = (y + sy * step + offset) / (size / DESIGN);
          const px = centerOffset + (bx - centerOffset) / contentScale;
          const py = centerOffset + (by - centerOffset) / contentScale;

          const [sr, sg, sb, sa] = sample(px, py, { bleed, contentScale, border });
          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }

      const n = supersample * supersample;
      const alpha = a / n;
      const idx = (y * size + x) * 4;
      // r/g/b are premultiplied sums, so dividing by the alpha sum un-premultplies
      // them back to straight (non-premultiplied) values for the PNG.
      if (a > 0) {
        rgba[idx] = Math.round(Math.min(255, r / a));
        rgba[idx + 1] = Math.round(Math.min(255, g / a));
        rgba[idx + 2] = Math.round(Math.min(255, b / a));
      }
      rgba[idx + 3] = Math.round(Math.min(255, alpha * 255));
    }
  }

  return encodePng(size, size, rgba);
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const TARGETS = [
  // Any-purpose launcher icons: the rounded tile, as designed.
  { file: 'icon-192.png', size: 192, bleed: false, contentScale: 1, border: true },
  { file: 'icon-512.png', size: 512, bleed: false, contentScale: 1, border: true },
  // Android adaptive icon: full bleed, artwork inside the 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, bleed: true, contentScale: 1.15, border: false },
  // iOS: full bleed, iOS supplies the mask, so artwork sits at a comfortable 66%.
  { file: 'apple-touch-icon.png', size: 180, bleed: true, contentScale: 1.25, border: false },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const target of TARGETS) {
  const png = renderIcon(target);
  const path = resolve(OUT_DIR, target.file);
  writeFileSync(path, png);
  console.log(`[icons] ${target.file} (${target.size}x${target.size}, ${png.length} bytes)`);
}
console.log(`[icons] wrote ${TARGETS.length} files to public/icons`);
