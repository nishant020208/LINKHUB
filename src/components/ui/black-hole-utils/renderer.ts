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

  // Gravitational deflection / lensing
  float r = length(uv);
  float rs = 0.28; // Schwarzschild event horizon radius
  
  if (r < rs) {
    // Inside event horizon: pure singularity shadow
    gl_FragColor = vec4(0.02, 0.02, 0.025, 1.0);
    return;
  }

  // Relativistic gravitational deflection formula
  float defl = (rs * rs * 0.75) / (r - rs * 0.82);
  vec2 lensed_uv = uv * (1.0 - defl / r);

  // Background cosmos / distant warped stars
  float stars = pow(hash(floor(lensed_uv * 120.0)), 28.0) * 0.8;
  vec3 col = vec3(0.03, 0.03, 0.04) + vec3(stars);

  // Photon ring: intense relativistic ring right above event horizon
  float photonDist = abs(r - rs * 1.14);
  float photonRing = exp(-photonDist * 45.0) * 1.8;
  col += u_glow_color * photonRing;

  // Accretion disk: tilted elliptical coords
  vec2 disk_uv = uv;
  disk_uv.y *= 2.6; // tilt inclination angle
  float disk_r = length(disk_uv);
  float disk_theta = atan(disk_uv.y, disk_uv.x);

  if (disk_r > rs * 0.95 && disk_r < 1.35) {
    // Keplerian differential rotation (inner rotates faster)
    float omega = t * 1.8 * pow(rs / disk_r, 1.4);
    float angle = disk_theta + omega;

    // Spiral swirl noise & turbulent filaments
    vec2 spiral_pos = vec2(cos(angle), sin(angle)) * disk_r;
    float spiral = fbm(spiral_pos * 4.5 + vec2(t * 0.2, -t * 0.15));

    // Radial intensity envelope: peak near ISCO (Innermost Stable Circular Orbit)
    float env = smoothstep(rs * 0.95, rs * 1.45, disk_r) * smoothstep(1.35, rs * 1.45, disk_r);
    
    // Relativistic Doppler beaming: approaching side (left, uv.x < 0) is boosted & blue-shifted
    float doppler = 1.0 - 0.55 * (uv.x / max(0.1, r));
    float intensity = env * (0.6 + 0.8 * spiral) * doppler * 2.2;

    vec3 disk_col = mix(u_disk_color, u_glow_color * 1.4, smoothstep(rs * 1.1, rs * 1.5, disk_r));
    col += disk_col * intensity;
  }

  // Outer ambient gravitational glow
  float outerGlow = exp(-r * 2.4) * 0.35;
  col += u_disk_color * outerGlow;

  // Subtle vignette
  float vig = smoothstep(1.6, 0.4, length(uv));
  col *= vig;

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
