export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
