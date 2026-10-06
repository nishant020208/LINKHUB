export const recursiveErosionSource = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recursive Erosion Particle Sphere</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #090a14; }
    #stage { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="stage"></canvas>
  <script>
    (function() {
      const canvas = document.getElementById('stage');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let w = canvas.width = window.innerWidth;
      let h = canvas.height = window.innerHeight;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const PARTICLE_COUNT = Math.min(850, Math.floor((w * h) / 1400));
      const particles = [];

      // Golden ratio spiral on sphere
      const phi = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * i;

        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;

        particles.push({
          origX: x, origY: y, origZ: z,
          x, y, z,
          scale: 1,
          hue: 260 + (i % 60), // Ultraviolet to purple/magenta
          noiseOffset: Math.random() * 100,
          size: Math.random() * 2.2 + 0.8
        });
      }

      function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      }
      window.addEventListener('resize', resize);

      let angleY = 0;
      let angleX = 0.25;
      let lastTime = performance.now();

      function simplexLike(x, y, z, t) {
        return Math.sin(x * 2.5 + t * 0.8) * Math.cos(y * 2.5 + t * 0.7) * Math.sin(z * 2.5 + t * 0.9);
      }

      function render(now) {
        const dt = (now - lastTime) * 0.001;
        lastTime = now;

        if (!reduceMotion) {
          angleY += dt * 0.35;
          angleX = 0.2 + Math.sin(now * 0.0004) * 0.15;
        }

        ctx.fillStyle = '#090a14';
        ctx.fillRect(0, 0, w, h);

        const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
        const cosX = Math.cos(angleX), sinX = Math.sin(angleX);

        const baseRadius = Math.min(w, h) * 0.38;
        const cx = w * 0.5;
        const cy = h * 0.5;
        const t = now * 0.0008;

        // Draw deep ambient glow behind sphere
        const grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.1, cx, cy, baseRadius * 1.4);
        grad.addColorStop(0, 'rgba(157, 92, 252, 0.16)'); // ultraviolet
        grad.addColorStop(0.5, 'rgba(110, 40, 230, 0.06)');
        grad.addColorStop(1, 'rgba(9, 10, 20, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Sort particles by rotated Z depth
        const rendered = [];

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // Recursive erosion displacement
          const n1 = simplexLike(p.origX, p.origY, p.origZ, t);
          const n2 = simplexLike(p.origX * 2, p.origY * 2, p.origZ * 2, t * 1.5) * 0.5;
          const erosion = (n1 + n2) * 0.35;

          const r = 1 + erosion;
          const px = p.origX * r;
          const py = p.origY * r;
          const pz = p.origZ * r;

          // Rotate around Y
          let x1 = px * cosY - pz * sinY;
          let z1 = px * sinY + pz * cosY;

          // Rotate around X
          let y2 = py * cosX - z1 * sinX;
          let z2 = py * sinX + z1 * cosX;

          // Perspective projection
          const fov = 800;
          const projZ = z2 * baseRadius + fov;
          if (projZ > 1) {
            const scale = fov / projZ;
            const sx = cx + x1 * baseRadius * scale;
            const sy = cy + y2 * baseRadius * scale;
            const alpha = Math.max(0.08, Math.min(0.95, (z2 + 1.2) * 0.45));

            rendered.push({
              sx, sy, z2, scale, alpha,
              size: p.size * scale,
              hue: p.hue
            });
          }
        }

        rendered.sort((a, b) => a.z2 - b.z2);

        // Render particles with aesthetic neon glow
        for (let i = 0; i < rendered.length; i++) {
          const pt = rendered[i];
          ctx.beginPath();
          ctx.arc(pt.sx, pt.sy, Math.max(0.6, pt.size), 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + pt.hue + ', 85%, 68%, ' + pt.alpha + ')';
          ctx.fill();

          // Subtle connection filaments between neighboring particles
          if (i > 0 && i % 4 === 0) {
            const prev = rendered[i - 1];
            const dist = Math.hypot(pt.sx - prev.sx, pt.sy - prev.sy);
            if (dist < 45) {
              ctx.beginPath();
              ctx.moveTo(pt.sx, pt.sy);
              ctx.lineTo(prev.sx, prev.sy);
              ctx.strokeStyle = 'hsla(' + pt.hue + ', 80%, 65%, ' + (pt.alpha * 0.15) + ')';
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          }
        }

        requestAnimationFrame(render);
      }

      requestAnimationFrame(render);
    })();
  </script>
</body>
</html>`;
