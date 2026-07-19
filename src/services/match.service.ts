import { ROUNDS } from "../core/constants.ts";
import type { KickResult, Phase } from "../core/types.ts";

export function hintText(
  phase: Phase,
  lastResult: KickResult | null,
  shotLabel = "",
) {
  switch (phase) {
    case "aim_shoot":
      return "Move the gold crosshair on the goal · hold to charge · release to shoot";
    case "charge":
      return shotLabel
        ? `${shotLabel} · release to strike`
        : "Power: mid = accurate · max = blast (may go over)";
    case "run_up":
      return "Messi steps up…";
    case "ball_fly":
      return shotLabel ? `${shotLabel}…` : "Watch the ball…";
    case "result":
      return lastResult === "goal"
        ? "GOAL!"
        : lastResult === "save"
          ? "Saved by the keeper!"
          : "Off target!";
    case "match_over":
      return "Shootout over";
    default:
      return "";
  }
}

export type MatchAdvance =
  | { type: "match_over" }
  | { type: "next_round"; round: number };

/** Messi takes all ROUNDS kicks vs the CPU keeper. */
export function advanceMatch(opts: { round: number }): MatchAdvance {
  if (opts.round >= ROUNDS) return { type: "match_over" };
  return { type: "next_round", round: opts.round + 1 };
}
