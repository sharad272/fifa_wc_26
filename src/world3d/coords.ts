import * as THREE from "three";
import { GOAL } from "../core/constants.ts";

/** World units — camera behind spot, looking at goal (−Z). */
export const SPOT = new THREE.Vector3(0, 0.11, 10.5);
export const GOAL_LINE_Z = -11;
export const GOAL_HALF_W = 3.66;
export const GOAL_H = 2.44;
export const PITCH_W = 28;
export const PITCH_D = 40;

/** Run-up start (behind the ball, camera side). */
export const PENALTY_MARK = { x: 1.2, z: SPOT.z + 1.85 };
/**
 * Body root at contact — just behind/right of the ball so the right foot
 * reaches SPOT without twisting the hips off-axis.
 */
export const STRIKE_ROOT = { x: 0.18, z: SPOT.z + 0.28 };
/** Kick progress (0..1) where swing crosses the ball — keep in sync with poseMessiKick. */
export const KICK_CONTACT = 0.45;

export function gameAimToWorld(gx: number, gy: number): THREE.Vector3 {
  const left = GOAL.x - GOAL.w / 2;
  const t = (gx - left) / GOAL.w;
  const x = (t - 0.5) * GOAL_HALF_W * 2;
  const u = (gy - GOAL.y) / GOAL.h;
  const y = GOAL_H * (1 - Math.min(1, Math.max(0, u)));
  return new THREE.Vector3(x, Math.max(0.12, y), GOAL_LINE_Z);
}

/**
 * FIFA-style ball path in 3D: loft arc + curl banana + optional turf skim.
 */
export function ballWorldFromNorm(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
  loft = 0.3,
  curl = 0,
): THREE.Vector3 {
  const ease = t * t * (3 - 2 * t);
  const fromX = (from.x - 0.5) * GOAL_HALF_W * 2.2;
  const toX = (to.x - 0.5) * GOAL_HALF_W * 2.2;
  const swerve = curl * 1.15 * Math.sin(Math.PI * t);
  const x = THREE.MathUtils.lerp(fromX, toX, ease) + swerve;

  const z = THREE.MathUtils.lerp(SPOT.z, GOAL_LINE_Z, ease);

  const yGround = 0.11;
  const yTarget = gameAimToWorld(to.x, to.y).y;
  // Loft: sin arc — grounded stays low, aerial peaks high
  const peak = 0.35 + loft * 2.4;
  let y = THREE.MathUtils.lerp(yGround, yTarget, ease) + Math.sin(Math.PI * t) * peak;
  // Grounded skim: pull early flight toward turf
  if (loft < 0.2) {
    y = THREE.MathUtils.lerp(yGround, y, 0.35 + t * 0.65);
    y = Math.max(yGround, y);
  }
  return new THREE.Vector3(x, y, z);
}

export function gkWorldX(normX: number): number {
  return (normX - 0.5) * GOAL_HALF_W * 2.1;
}
