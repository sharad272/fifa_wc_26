export type Phase =
  | "idle"
  | "aim_shoot"
  | "charge"
  | "run_up"
  | "ball_fly"
  | "result"
  | "match_over";

export type KickResult = "goal" | "save" | "miss";

export interface Vec {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface KickRecord {
  result: KickResult;
}

export interface HudState {
  phase: Phase;
  youScore: number;
  cpuScore: number;
  round: number;
  suddenDeath: boolean;
  youKicks: KickRecord[];
  cpuKicks: KickRecord[];
  power: number;
  shooterIsYou: boolean;
  lastResult: KickResult | null;
  hint: string;
  shotLabel: string;
}

export interface Scene {
  w: number;
  h: number;
  phase: Phase;
  aim: Vec;
  ball: Vec;
  ballSpin: number;
  power: number;
  gkX: number;
  gkDive: number;
  gkArm: number;
  netRipple: number;
  crowdPulse: number;
  messiKick: number;
  /** 0..1 progress of the run-up towards the ball */
  runUpT: number;
  messiCelebrate: number;
  /** 1 = any successful goal celebration playing */
  goalCelebrate: number;
  celebrateT: number;
  lastScorerIsMessi: boolean;
  particles: Particle[];
  shotLoft: number;
  shotCurl: number;
}
