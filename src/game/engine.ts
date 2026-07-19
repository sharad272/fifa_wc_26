import { BALL_START, GOAL } from "../core/constants.ts";
import { clamp, lerp } from "../core/math.ts";
import type { HudState, KickResult, Phase, Particle, Vec } from "../core/types.ts";
import { advanceMatch, hintText } from "../services/match.service.ts";
import {
  createBurst,
  createConfettiPulse,
  updateParticles,
} from "../services/particles.service.ts";
import {
  clampAim,
  planPlayerShot,
  previewShotStyle,
  resolvePlayerShot,
  sampleBallFlight,
  type DiveHeight,
  type ShotStyle,
} from "../services/shot.service.ts";
import { KICK_CONTACT } from "../world3d/coords.ts";
import { World3D } from "../world3d/World3D.ts";

export class PenaltyGame {
  private canvas: HTMLCanvasElement;
  private world: World3D;
  private w = 0;
  private h = 0;
  private raf = 0;
  private lastTs = 0;

  private phase: Phase = "idle";
  private aim: Vec = { x: 0.5, y: 0.32 };
  private power = 0;
  private charging = false;
  private chargeDir = 1;

  private ball: Vec = { ...BALL_START };
  private ballFrom: Vec = { ...BALL_START };
  private ballTo: Vec = { ...BALL_START };
  private ballT = 0;
  private ballSpin = 0;
  private shotStyle: ShotStyle = "placed";
  private shotLoft = 0.3;
  private shotCurl = 0;
  private shotSpeed = 1.2;
  private shotSpin = 0;
  private shotLabel = "";
  private gkDiveHeight: DiveHeight = "mid";

  private gkX = 0.5;
  private gkTarget = 0.5;
  private gkDive = 0;
  private gkArm = 0;

  private youScore = 0;
  private cpuScore = 0;
  private round = 1;
  private youKicks: { result: KickResult }[] = [];
  private cpuKicks: { result: KickResult }[] = [];
  private suddenDeath = false;
  private lastResult: KickResult | null = null;
  private resultTimer = 0;
  private shooterIsYou = true;

  private particles: Particle[] = [];
  private netRipple = 0;
  private crowdPulse = 0;
  private messiKick = 0;
  private runUpT = 0;
  private messiCelebrate = 0;
  private goalCelebrate = 0;
  private lastScorerIsMessi = true;
  private celebrateT = 0;
  private confettiPulseAt = 0;

  private onHud: () => void;

  constructor(canvas: HTMLCanvasElement, onHud: () => void) {
    this.canvas = canvas;
    this.world = new World3D(canvas);
    this.onHud = onHud;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    canvas.addEventListener("pointerleave", () => this.onPointerLeave());
  }

  getState(): HudState {
    const preview =
      this.phase === "aim_shoot" || this.phase === "charge"
        ? previewShotStyle(this.aim, Math.max(this.power, 0.35)).label
        : this.shotLabel;
    return {
      phase: this.phase,
      youScore: this.youScore,
      cpuScore: this.cpuScore,
      round: this.round,
      suddenDeath: this.suddenDeath,
      youKicks: this.youKicks,
      cpuKicks: this.cpuKicks,
      power: this.power,
      shooterIsYou: this.shooterIsYou,
      lastResult: this.lastResult,
      shotLabel: preview,
      hint: hintText(this.phase, this.lastResult, preview),
    };
  }

  start() {
    this.resetMatch();
    this.beginShootPhase();
    this.onHud();
    this.startLoop();
  }

  restart() {
    this.resetMatch();
    this.beginShootPhase();
    this.onHud();
  }

  private resetMatch() {
    this.youScore = 0;
    this.cpuScore = 0;
    this.round = 1;
    this.youKicks = [];
    this.cpuKicks = [];
    this.suddenDeath = false;
    this.lastResult = null;
    this.particles = [];
    this.shooterIsYou = true;
    this.power = 0;
    this.charging = false;
    this.ball = { ...BALL_START };
    this.gkX = 0.5;
    this.gkDive = 0;
    this.gkArm = 0;
    this.netRipple = 0;
    this.messiKick = 0;
    this.runUpT = 0;
    this.messiCelebrate = 0;
    this.goalCelebrate = 0;
    this.lastScorerIsMessi = true;
    this.celebrateT = 0;
    this.confettiPulseAt = 0;
  }

  private beginShootPhase() {
    this.phase = "aim_shoot";
    this.shooterIsYou = true;
    this.ball = { ...BALL_START };
    this.ballSpin = 0;
    this.power = 0;
    this.charging = false;
    this.gkX = 0.5;
    this.gkTarget = 0.5;
    this.gkDive = 0;
    this.gkArm = 0;
    this.aim = { x: 0.5, y: GOAL.y + GOAL.h * 0.55 };
    this.messiKick = 0;
    this.runUpT = 0;
    this.messiCelebrate = 0;
    this.goalCelebrate = 0;
    this.celebrateT = 0;
    this.confettiPulseAt = 0;
    this.shotLabel = "";
    this.shotLoft = 0.3;
    this.shotCurl = 0;
    this.shotStyle = "placed";
  }

  private applyShotPlan(plan: ReturnType<typeof planPlayerShot>) {
    this.ballFrom = plan.ballFrom;
    this.ballTo = plan.ballTo;
    this.shotStyle = plan.style;
    this.shotLoft = plan.loft;
    this.shotCurl = plan.curl;
    this.shotSpeed = plan.speed;
    this.shotSpin = plan.spin;
    this.shotLabel = plan.label;
    this.gkTarget = plan.gkTarget;
    this.gkDive = plan.gkDive;
    this.gkDiveHeight = plan.gkDiveHeight;
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const cssW = parent?.clientWidth || window.innerWidth;
    const cssH = parent?.clientHeight || window.innerHeight;
    this.w = cssW;
    this.h = cssH;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.world.resize(cssW, cssH);
  }

  private pointerNorm(e: PointerEvent): Vec {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  private onPointerDown(e: PointerEvent) {
    const p = this.pointerNorm(e);
    if (this.phase === "aim_shoot") {
      this.aim = clampAim(p);
      this.charging = true;
      this.power = 0.08;
      this.chargeDir = 1;
      this.phase = "charge";
      this.canvas.setPointerCapture(e.pointerId);
      this.onHud();
    }
  }

  private onPointerMove(e: PointerEvent) {
    const p = this.pointerNorm(e);
    if (this.phase === "aim_shoot" || this.phase === "charge") {
      this.aim = clampAim(p);
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (this.phase === "charge" && this.charging) {
      this.charging = false;
      this.fireShot();
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  private onPointerLeave() {
    if (this.phase === "charge" && this.charging) {
      this.charging = false;
      this.fireShot();
    }
  }

  private fireShot() {
    const plan = planPlayerShot(this.aim, this.power);
    this.applyShotPlan(plan);
    this.ballT = 0;
    this.messiKick = 0;
    this.runUpT = 0;
    this.phase = "run_up";
    this.crowdPulse = 1;
    this.onHud();
  }

  private finishKick(result: KickResult) {
    this.lastResult = result;
    this.phase = "result";
    this.celebrateT = 0;
    this.confettiPulseAt = 0;
    this.goalCelebrate = 0;

    this.youKicks.push({ result });
    if (result === "goal") {
      this.youScore += 1;
      this.triggerGoalCelebration();
    } else {
      // CPU keeper "earns" a point on saves/misses
      this.cpuScore += 1;
      this.cpuKicks.push({ result: "save" });
      this.resultTimer = 1.2;
      this.messiCelebrate = -1;
      this.particles.push(
        ...createBurst(this.gkX, GOAL.y + GOAL.h * 0.5, this.w, this.h, false),
      );
    }

    this.onHud();
  }

  /** Messi's iconic sky-point celebration after every goal. */
  private triggerGoalCelebration() {
    this.lastScorerIsMessi = true;
    this.goalCelebrate = 1;
    this.messiCelebrate = 1;
    // Hold long enough to see Messi's sky-point clearly
    // Run celebration + sky-point hold
    this.resultTimer = 5.2;
    this.netRipple = 1;
    this.crowdPulse = 1;
    this.celebrateT = 0;
    this.particles.push(
      ...createBurst(this.ballTo.x, this.ballTo.y, this.w, this.h, true),
      ...createBurst(GOAL.x, GOAL.y + GOAL.h * 0.4, this.w, this.h, true),
      ...createBurst(BALL_START.x + 0.05, BALL_START.y - 0.06, this.w, this.h, true),
    );
  }

  private advanceAfterResult() {
    const next = advanceMatch({ round: this.round });

    if (next.type === "match_over") {
      this.phase = "match_over";
      this.onHud();
      return;
    }

    this.round = next.round;
    this.beginShootPhase();
    this.onHud();
  }

  private startLoop() {
    cancelAnimationFrame(this.raf);
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.033, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private update(dt: number) {
    if (this.phase === "charge" && this.charging) {
      this.power += dt * 0.85 * this.chargeDir;
      if (this.power >= 1) {
        this.power = 1;
        this.chargeDir = -1;
      } else if (this.power <= 0.05) {
        this.power = 0.05;
        this.chargeDir = 1;
      }
      this.onHud();
    }

    if (this.phase === "run_up") {
      // Approach (~0.75s) then plant/backswing so the foot meets the ball on launch
      this.runUpT = clamp(this.runUpT + dt / 0.95, 0, 1);
      // Final third of the run-up: load the kick up to the contact frame
      if (this.runUpT > 0.68) {
        const wind = (this.runUpT - 0.68) / 0.32;
        this.messiKick = wind * KICK_CONTACT;
      } else {
        this.messiKick = 0;
      }
      if (this.runUpT >= 1) {
        // Ball leaves the foot on the contact frame
        this.phase = "ball_fly";
        this.ballT = 0;
        this.messiKick = KICK_CONTACT;
        this.onHud();
      }
    }

    if (this.phase === "ball_fly" && this.shooterIsYou) {
      // Follow-through after contact
      this.messiKick = clamp(this.messiKick + dt * 2.8, 0, 1);
    }

    if (this.phase === "result" && (this.goalCelebrate > 0 || this.messiCelebrate !== 0)) {
      this.celebrateT += dt;

      // Hold full celebration until the final beat, then ease out
      if (this.resultTimer < 0.55) {
        this.goalCelebrate *= Math.exp(-dt * 4);
        this.messiCelebrate *= Math.exp(-dt * 4);
        if (this.goalCelebrate < 0.05) this.goalCelebrate = 0;
        if (Math.abs(this.messiCelebrate) < 0.05) this.messiCelebrate = 0;
      } else {
        // Keep Messi celebrate locked at full while celebrating
        if (this.lastScorerIsMessi && this.messiCelebrate > 0) {
          this.messiCelebrate = 1;
        }
        this.goalCelebrate = 1;
      }

      // Confetti after every goal
      if (this.goalCelebrate > 0.2 && this.celebrateT - this.confettiPulseAt > 0.12) {
        this.confettiPulseAt = this.celebrateT;
        const px = this.lastScorerIsMessi
          ? BALL_START.x + 0.05
          : GOAL.x + (Math.random() - 0.5) * 0.15;
        const py = this.lastScorerIsMessi
          ? BALL_START.y - 0.08
          : GOAL.y + GOAL.h * 0.35;
        this.particles.push(...createConfettiPulse(px, py, this.w, this.h));
      }
    }

    if (this.phase === "ball_fly") {
      this.ballT = clamp(this.ballT + dt * this.shotSpeed, 0, 1);
      this.ball = sampleBallFlight(
        this.ballFrom,
        this.ballTo,
        this.ballT,
        this.shotLoft,
        this.shotCurl,
      );
      this.ballSpin += dt * (8 + Math.abs(this.shotSpin) + this.power * 10);

      // Keeper reads the flight and moves with the ball (reaction lag, not perfect)
      if (this.ballT > 0.1) {
        const react = clamp((this.ballT - 0.1) / 0.4, 0, 1);
        const ballX = clamp(this.ball.x, 0.22, 0.78);
        // Blend initial guess → live ball track as the shot develops
        this.gkTarget = lerp(this.gkTarget, ballX, 0.12 + react * 0.55);
        this.gkDive = this.gkTarget - 0.5;
        // Dive height follows ball height (smaller y = higher in goal space)
        const h = (this.ball.y - GOAL.y) / GOAL.h;
        this.gkDiveHeight = h < 0.35 ? "high" : h > 0.68 ? "low" : "mid";
      }

      // Faster shots → less time for keeper to arrive
      const gkCatch =
        this.shotStyle === "power" ? 6.2 : this.shotStyle === "placed" ? 8.2 : 7.2;
      this.gkX = lerp(this.gkX, this.gkTarget, 1 - Math.exp(-dt * gkCatch));
      this.gkArm = lerp(
        this.gkArm,
        Math.sign(this.ball.x - this.gkX) || Math.sign(this.gkDive) || 0,
        1 - Math.exp(-dt * 7),
      );

      if (this.ballT >= 1) {
        this.finishKick(
          resolvePlayerShot(
            this.ballTo,
            this.gkX,
            this.gkDive,
            this.power,
            this.shotStyle,
            this.gkDiveHeight,
          ),
        );
      }
    }

    if (this.phase === "result") {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.advanceAfterResult();
    }

    if (
      this.phase === "aim_shoot" ||
      this.phase === "charge" ||
      this.phase === "run_up"
    ) {
      this.gkX = 0.5 + Math.sin(performance.now() / 420) * 0.018;
    }

    this.netRipple = Math.max(0, this.netRipple - dt * 1.4);
    this.crowdPulse = Math.max(0, this.crowdPulse - dt * 0.8);
    updateParticles(this.particles, dt);
  }

  private draw() {
    this.world.sync({
      w: this.w,
      h: this.h,
      phase: this.phase,
      aim: this.aim,
      ball: this.ball,
      ballSpin: this.ballSpin,
      power: this.power,
      gkX: this.gkX,
      gkDive: this.gkDive,
      gkArm: this.gkArm,
      netRipple: this.netRipple,
      crowdPulse: this.crowdPulse,
      messiKick: this.messiKick,
      runUpT: this.runUpT,
      messiCelebrate: this.messiCelebrate,
      goalCelebrate: this.goalCelebrate,
      celebrateT: this.celebrateT,
      lastScorerIsMessi: this.lastScorerIsMessi,
      particles: this.particles,
      shotLoft: this.shotLoft,
      shotCurl: this.shotCurl,
      ballFrom: this.ballFrom,
      ballTo: this.ballTo,
      ballT: this.ballT,
    });
    this.world.render();
  }
}
