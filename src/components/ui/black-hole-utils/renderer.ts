export type BlackHoleRendererOptions = {
  canvas: HTMLCanvasElement;
  diskColor?: [number, number, number]; // RGB normalized 0-1
  glowColor?: [number, number, number];
  speed?: number;
};

export type BlackHoleRenderer = {
  ready: Promise<void>;
  dispose: () => void;
};

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_disk_color;
uniform vec3 u_glow_color;
uniform float u_speed;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.87, 0.5, -0.5, 0.87);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.1 + vec2(1.7, 3.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed;
  float r = length(uv);

  // Black hole event horizon shadow radius
  float rs = 0.20;

  // Pure deep cosmic void background (no white star speckles)
  vec3 col = vec3(0.004, 0.004, 0.007);

  // 1. EQUATORIAL DISK (horizontal glowing band)
  float eq_x = abs(uv.x);
  float eq_y = abs(uv.y);
  if (eq_x < 1.1 && eq_y < 0.16) {
    float distFromCenter = length(vec2(uv.x * 0.62, uv.y * 3.6));
    if (distFromCenter > rs * 0.75 && distFromCenter < 0.72) {
      float disk_profile = exp(-pow(uv.y * 14.0, 2.0));
      float rad_profile = smoothstep(rs * 0.75, rs * 1.35, distFromCenter) * smoothstep(0.72, rs * 1.6, distFromCenter);
      float angle = atan(uv.y, uv.x) + t * 1.4 * pow(rs / max(0.08, distFromCenter), 1.2);
      float swirl = fbm(vec2(distFromCenter * 7.5, angle * 3.0) + vec2(t * 0.1, -t * 0.18));
      
      // Relativistic Doppler beaming: approaching side (left, uv.x < 0) is brighter
      float doppler = 1.0 - 0.48 * (uv.x / max(0.1, distFromCenter));
      float disk_intensity = disk_profile * rad_profile * (0.7 + 0.6 * swirl) * doppler * 3.0;

      vec3 disk_col = mix(vec3(1.0, 0.95, 0.85), u_disk_color * 1.35, smoothstep(rs * 0.9, 0.55, distFromCenter));
      col += disk_col * disk_intensity;
    }
  }

  // 2. UPPER GRAVITATIONAL LENSED ARCH (halo bending over the black hole)
  if (uv.y > -0.06) {
    float arch_r = length(vec2(uv.x * 0.92, (uv.y - 0.015) * 1.18));
    float arch_dist = abs(arch_r - rs * 1.54);
    if (arch_dist < 0.13) {
      float arch_profile = exp(-arch_dist * 26.0) * smoothstep(-0.06, 0.12, uv.y);
      float angle = atan(uv.y, uv.x) - t * 1.2;
      float swirl = fbm(vec2(arch_r * 9.5, angle * 3.8));
      float doppler = 1.0 - 0.42 * (uv.x / max(0.1, arch_r));
      float arch_intensity = arch_profile * (0.8 + 0.5 * swirl) * doppler * 2.8;

      vec3 arch_col = mix(vec3(1.0, 0.96, 0.88), u_glow_color * 1.25, smoothstep(0.0, 0.1, arch_dist));
      col += arch_col * arch_intensity;
    }
  }

  // 3. LOWER GRAVITATIONAL LENSED ARCH (halo bending under the black hole)
  if (uv.y < 0.06) {
    float arch_r = length(vec2(uv.x * 1.06, (uv.y + 0.015) * 1.26));
    float arch_dist = abs(arch_r - rs * 1.30);
    if (arch_dist < 0.10) {
      float arch_profile = exp(-arch_dist * 32.0) * smoothstep(0.06, -0.10, uv.y);
      float angle = atan(uv.y, uv.x) - t * 1.2;
      float swirl = fbm(vec2(arch_r * 10.5, angle * 3.8));
      float doppler = 1.0 - 0.38 * (uv.x / max(0.1, arch_r));
      float arch_intensity = arch_profile * (0.7 + 0.5 * swirl) * doppler * 2.2;

      vec3 arch_col = mix(vec3(1.0, 0.92, 0.8), u_glow_color * 1.1, smoothstep(0.0, 0.08, arch_dist));
      col += arch_col * arch_intensity;
    }
  }

  // 4. PHOTON RING (intense razor-sharp ring right outside the shadow)
  float ringDist = abs(r - rs * 1.07);
  float photonRing = exp(-ringDist * 75.0) * 3.4;
  col += vec3(1.0, 0.97, 0.88) * photonRing;

  // 5. EVENT HORIZON SHADOW (pure singularity occlusion)
  if (r < rs) {
    col = vec3(0.003, 0.003, 0.005);
  }

  // Outer ambient gravitational glow
  float haze = exp(-r * 3.2) * 0.28;
  col += u_disk_color * haze;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createRenderer({
  canvas,
  diskColor = [0.91, 0.65, 0.29], // UnifyHub amber #e8a54b
  glowColor = [0.98, 0.82, 0.52], // Radiant amber glow
  speed = 0.8,
}: BlackHoleRendererOptions): BlackHoleRenderer {
  let disposed = false;
  let rafId = 0;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    return {
      ready: Promise.resolve(),
      dispose: () => {},
    };
  }

  const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

  if (!vert || !frag) {
    return {
      ready: Promise.resolve(),
      dispose: () => {},
    };
  }

  const program = gl.createProgram();
  if (!program) {
    return {
      ready: Promise.resolve(),
      dispose: () => {},
    };
  }

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "a_position");
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return {
      ready: Promise.resolve(),
      dispose: () => {},
    };
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const locRes = gl.getUniformLocation(program, "u_resolution");
  const locTime = gl.getUniformLocation(program, "u_time");
  const locDisk = gl.getUniformLocation(program, "u_disk_color");
  const locGlow = gl.getUniformLocation(program, "u_glow_color");
  const locSpeed = gl.getUniformLocation(program, "u_speed");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const resize = () => {
    if (disposed || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(locRes, w, h);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  gl.uniform3f(locDisk, diskColor[0], diskColor[1], diskColor[2]);
  gl.uniform3f(locGlow, glowColor[0], glowColor[1], glowColor[2]);
  gl.uniform1f(locSpeed, speed);

  const startTime = performance.now();

  const renderLoop = (time: number) => {
    if (disposed) return;
    const elapsed = reduceMotion ? 0 : (time - startTime) * 0.001;
    gl.uniform1f(locTime, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(renderLoop);
  };

  rafId = requestAnimationFrame(renderLoop);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    observer.disconnect();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
  };

  return {
    ready: Promise.resolve(),
    dispose,
  };
}
