import type { Particle } from "../core/types.ts";
import { clamp, rand } from "../core/math.ts";

export function createBurst(
  xNorm: number,
  yNorm: number,
  w: number,
  h: number,
  celebration: boolean,
): Particle[] {
  const colors = celebration
    ? ["#e8b84a", "#f4f7f2", "#1f8f62", "#e8a87c", "#74acdf"]
    : ["#8ec5ff", "#f4f7f2", "#2a6fdb"];
  const count = celebration ? 56 : 22;
  const out: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const ang = rand(0, Math.PI * 2);
    const spd = rand(90, 320);
    out.push({
      x: xNorm * w,
      y: yNorm * h,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 80,
      life: rand(0.6, 1.35),
      color: colors[i % colors.length],
      size: rand(2, 6),
    });
  }

  return out;
}

/** Small ongoing confetti pulse around Messi during a goal celebration. */
export function createConfettiPulse(
  xNorm: number,
  yNorm: number,
  w: number,
  h: number,
): Particle[] {
  const colors = ["#e8b84a", "#f4f7f2", "#74acdf", "#e85a8a", "#1f8f62"];
  const out: Particle[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = rand(-Math.PI * 0.9, -Math.PI * 0.1);
    const spd = rand(60, 180);
    out.push({
      x: xNorm * w + rand(-18, 18),
      y: yNorm * h + rand(-30, 10),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: rand(0.35, 0.75),
      color: colors[i % colors.length],
      size: rand(2, 5),
    });
  }
  return out;
}

export function updateParticles(particles: Particle[], dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
