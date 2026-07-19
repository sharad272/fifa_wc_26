import { BALL_START, GOAL } from "../core/constants.ts";
import { clamp, rand } from "../core/math.ts";
import type { KickResult, Vec } from "../core/types.ts";

/** FIFA / PES style shot categories. */
export type ShotStyle = "grounded" | "placed" | "aerial" | "power";

export type DiveHeight = "low" | "mid" | "high";

export interface ShotPlan {
  ballFrom: Vec;
  /** Intended aim (before error). */
  aim: Vec;
  /** Actual landing / goal-line point after error. */
  ballTo: Vec;
  style: ShotStyle;
  /** 0 = skims turf, 1 = big lofted arc */
  loft: number;
  /** −1 = swerve left (from kicker), +1 = swerve right */
  curl: number;
  /** Flight duration multiplier */
  speed: number;
  /** Side-spin for ball visual */
  spin: number;
  gkTarget: number;
  gkDive: number;
  gkDiveHeight: DiveHeight;
  label: string;
}

export function clampAim(p: Vec): Vec {
  const left = GOAL.x - GOAL.w / 2;
  const right = GOAL.x + GOAL.w / 2;
  const top = GOAL.y;
  const bottom = GOAL.y + GOAL.h;
  return {
    x: clamp(p.x, left + 0.01, right - 0.01),
    y: clamp(p.y, top + 0.01, bottom - 0.01),
  };
}

export function pointInGoal(p: Vec) {
  const left = GOAL.x - GOAL.w / 2;
  const right = GOAL.x + GOAL.w / 2;
  return p.x >= left && p.x <= right && p.y >= GOAL.y && p.y <= GOAL.y + GOAL.h;
}

/** 0 = crossbar (aerial), 1 = turf (grounded). */
export function aimHeightNorm(aim: Vec) {
  return clamp((aim.y - GOAL.y) / GOAL.h, 0, 1);
}

/** Preview shot style while aiming (HUD). */
export function previewShotStyle(aim: Vec, power: number): { style: ShotStyle; label: string } {
  const h = aimHeightNorm(aim);
  if (h > 0.7 && power < 0.88) {
    return { style: "grounded", label: "LOW DRIVEN · along the turf" };
  }
  if (h < 0.28 || (power < 0.42 && h < 0.45)) {
    return { style: "aerial", label: "AERIAL · lofted finish" };
  }
  if (power > 0.82) {
    return { style: "power", label: "POWER · blast — risk over the bar" };
  }
  return { style: "placed", label: "PLACED · side-netting curl" };
}

function classifyShot(aim: Vec, power: number): ShotStyle {
  return previewShotStyle(aim, power).style;
}

function styleParams(style: ShotStyle, aim: Vec, power: number) {
  const side = aim.x - 0.5; // − left, + right of centre
  switch (style) {
    case "grounded":
      return {
        loft: 0.08 + power * 0.06,
        curl: side * -0.55 * (0.7 + power * 0.3),
        speed: 1.35 + power * 0.55,
        spin: side * 8,
        label: "LOW DRIVEN",
        dive: "low" as DiveHeight,
      };
    case "aerial":
      return {
        loft: 0.55 + (1 - aimHeightNorm(aim)) * 0.35 + power * 0.1,
        curl: side * -0.35,
        speed: 0.95 + power * 0.45,
        spin: side * 5 + 3,
        label: "AERIAL",
        dive: "high" as DiveHeight,
      };
    case "power":
      return {
        loft: 0.22 + (1 - aimHeightNorm(aim)) * 0.25,
        curl: side * -0.25,
        speed: 1.75 + power * 0.55,
        spin: side * 4 + power * 6,
        label: "POWER SHOT",
        dive: aimHeightNorm(aim) < 0.4 ? "high" as DiveHeight : "mid" as DiveHeight,
      };
    default:
      return {
        loft: 0.28 + power * 0.12,
        curl: side * -1.05 * (1.1 - power * 0.35),
        speed: 1.15 + power * 0.5,
        spin: side * -12,
        label: "PLACED",
        dive: "mid" as DiveHeight,
      };
  }
}

/**
 * FIFA/PES-like penalty: aim + power pick style, then accuracy / loft / curl.
 */
export function planPlayerShot(aim: Vec, power: number): ShotPlan {
  const style = classifyShot(aim, power);
  const params = styleParams(style, aim, power);

  // Accuracy: sweet spot ~0.55–0.78 power; extremes miss more
  const sweet = 1 - Math.abs(power - 0.66) * 1.6;
  const accuracy = clamp(0.25 + sweet * 0.7, 0.15, 0.95);
  const jitter = (1 - accuracy) * (0.04 + power * 0.03);

  let ballTo: Vec = {
    x: aim.x + rand(-jitter, jitter),
    y: aim.y + rand(-jitter * 0.7, jitter * 0.7),
  };

  // Style-specific miss models (like PES error)
  if (style === "power" && power > 0.9 && Math.random() < 0.4) {
    // Sail over the bar
    ballTo = { x: aim.x + rand(-0.03, 0.03), y: GOAL.y - 0.07 - rand(0, 0.04) };
  } else if (style === "grounded" && power < 0.28 && Math.random() < 0.35) {
    // Under-hit — scuff wide or short of post
    ballTo = {
      x: aim.x + (aim.x < 0.5 ? -0.14 : 0.14),
      y: GOAL.y + GOAL.h + 0.02,
    };
  } else if (style === "aerial" && power > 0.85 && Math.random() < 0.3) {
    ballTo = { x: aim.x + rand(-0.04, 0.04), y: GOAL.y - 0.05 };
  } else if (Math.abs(aim.x - 0.5) > 0.18 && accuracy < 0.45 && Math.random() < 0.4) {
    // Far post miss — wide of the angle
    ballTo = {
      x: aim.x + Math.sign(aim.x - 0.5) * (0.1 + rand(0, 0.06)),
      y: clamp(aim.y + rand(-0.03, 0.03), GOAL.y - 0.02, GOAL.y + GOAL.h + 0.02),
    };
  }

  // Grounded finishes bias end height toward bottom of goal when on target
  if (style === "grounded" && pointInGoal(ballTo)) {
    ballTo.y = clamp(Math.max(ballTo.y, GOAL.y + GOAL.h * 0.72), GOAL.y + 0.02, GOAL.y + GOAL.h - 0.02);
  }
  // Aerial bias toward upper third
  if (style === "aerial" && pointInGoal(ballTo)) {
    ballTo.y = clamp(Math.min(ballTo.y, GOAL.y + GOAL.h * 0.38), GOAL.y + 0.02, GOAL.y + GOAL.h - 0.02);
  }

  // CPU keeper guesses a zone (left / center / right) like a real penalty.
  // Disguised placed shots are hardest to read; big blasts are telegraphed.
  const zoneCenters = [0.33, 0.5, 0.67];
  const shotZone = ballTo.x < 0.42 ? 0 : ballTo.x > 0.58 ? 2 : 1;
  const readChance =
    style === "placed" ? 0.35 : style === "grounded" ? 0.42 : style === "power" ? 0.48 : 0.45;
  let gkZone: number;
  if (Math.random() < readChance) {
    gkZone = shotZone;
  } else {
    const others = [0, 1, 2].filter((z) => z !== shotZone);
    gkZone = others[Math.floor(Math.random() * others.length)];
  }
  const gkTarget = clamp(zoneCenters[gkZone] + rand(-0.035, 0.035), 0.26, 0.74);

  // Keeper also has to guess the height
  const heights: DiveHeight[] = ["low", "mid", "high"];
  const gkDiveHeight =
    Math.random() < 0.55 ? params.dive : heights[Math.floor(Math.random() * heights.length)];

  return {
    ballFrom: { ...BALL_START },
    aim: { ...aim },
    ballTo,
    style,
    loft: params.loft,
    curl: params.curl,
    speed: params.speed,
    spin: params.spin,
    gkTarget,
    gkDive: gkTarget - 0.5,
    gkDiveHeight,
    label: params.label,
  };
}

/**
 * Sample ball position during flight (normalized pitch space).
 * curl = sideways banana; loft = height of parabola.
 */
export function sampleBallFlight(
  from: Vec,
  to: Vec,
  t: number,
  loft: number,
  curl: number,
): Vec {
  const ease = t * t * (3 - 2 * t); // smoothstep
  // Curl peaks mid-flight then settles into target (PES swerve)
  const swerve = curl * 0.09 * Math.sin(Math.PI * t);
  const x = from.x + (to.x - from.x) * ease + swerve;
  // Screen Y: smaller = higher. Loft lifts the ball mid-flight.
  const baseY = from.y + (to.y - from.y) * ease;
  const lift = loft * 0.16 * Math.sin(Math.PI * t);
  // Grounded: keep early flight flatter (skimming)
  const groundedBias = loft < 0.18 ? (1 - t) * 0.02 : 0;
  const y = baseY - lift + groundedBias;
  return { x, y };
}

export function resolvePlayerShot(
  ballTo: Vec,
  gkX: number,
  gkDive: number,
  power: number,
  style: ShotStyle = "placed",
  diveHeight: DiveHeight = "mid",
): KickResult {
  if (!pointInGoal(ballTo)) return "miss";

  const shotH = aimHeightNorm(ballTo);
  // Keeper coverage band by dive height
  let coverY = GOAL.y + GOAL.h * 0.55;
  let reachY = 0.1;
  if (diveHeight === "low") {
    coverY = GOAL.y + GOAL.h * 0.82;
    reachY = 0.08;
  } else if (diveHeight === "high") {
    coverY = GOAL.y + GOAL.h * 0.28;
    reachY = 0.1;
  }

  // Wrong height dive = weaker reach
  const heightMismatch = Math.abs(shotH - (diveHeight === "low" ? 0.85 : diveHeight === "high" ? 0.25 : 0.5));
  const reachPenalty = heightMismatch > 0.35 ? 0.55 : 1;

  let gkReach = (0.075 + Math.abs(gkDive) * 0.025) * reachPenalty;
  // Placed far corner / power blast harder to stop
  if (style === "placed") gkReach *= 0.88;
  if (style === "power" && power > 0.85) gkReach *= 0.8;
  if (style === "grounded" && Math.abs(ballTo.x - 0.5) > 0.16) gkReach *= 0.85;

  const dx = Math.abs(ballTo.x - gkX);
  const dy = Math.abs(ballTo.y - coverY);
  const saved = dx < gkReach && dy < reachY && !(style === "power" && power > 0.95 && Math.random() < 0.35);
  return saved ? "save" : "goal";
}
