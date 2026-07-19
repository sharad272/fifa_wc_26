import * as THREE from "three";
import type { Scene as GameScene } from "../core/types.ts";
import {
  createKeeper,
  createMessi,
  MESSI_FACE_YAW,
  poseKeeperDive,
  poseKeeperReady,
  poseMessiIdle,
  poseMessiKick,
  poseMessiSkyPoint,
  type Humanoid,
} from "./characters.ts";
import {
  GOAL_H,
  GOAL_HALF_W,
  GOAL_LINE_Z,
  KICK_CONTACT,
  PENALTY_MARK,
  PITCH_D,
  PITCH_W,
  SPOT,
  STRIKE_ROOT,
  ballWorldFromNorm,
  gameAimToWorld,
  gkWorldX,
} from "./coords.ts";
import { createCeleBannerTexture } from "./messiFace.ts";
import { createRig, type Rig } from "./rig.ts";

/** Round sprite for Points — without this, Three.js draws hard squares. */
function softDotTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private messi: Humanoid;
  private keeper: Humanoid;
  private ball: THREE.Mesh;
  private aimMarker: THREE.Group;
  private confetti: THREE.Points | null = null;
  private clock = new THREE.Clock();
  private goalGlow: THREE.PointLight;
  private celeBanner: THREE.Mesh;
  private celeLight: THREE.PointLight;
  private skyBeams: THREE.Group;
  private celeBannerMessi: boolean | null = null;
  private messiRig: Rig | null = null;
  private keeperRig: Rig | null = null;
  private lastT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(0, 2.8, 16.5);
    this.camera.lookAt(0, 1.2, GOAL_LINE_Z);

    this.scene.background = new THREE.Color("#0a1520");
    this.scene.fog = new THREE.Fog("#0a1520", 28, 70);

    this.buildLights();
    this.buildStadium();
    this.buildPitch();
    this.buildGoal();

    this.messi = createMessi();
    // Stand beside the ball in ¾ view so face/kit read clearly
    this.messi.root.position.set(1.05, 0, SPOT.z + 0.5);
    this.messi.root.rotation.y = MESSI_FACE_YAW;
    this.scene.add(this.messi.root);

    this.keeper = createKeeper();
    this.keeper.root.position.set(0, 0, GOAL_LINE_Z + 0.55);
    this.keeper.root.rotation.y = 0;
    this.scene.add(this.keeper.root);

    this.ball = this.createBall();
    this.ball.position.copy(SPOT);
    this.scene.add(this.ball);

    this.aimMarker = this.createAimReticle();
    this.scene.add(this.aimMarker);

    this.goalGlow = new THREE.PointLight("#e8b84a", 0, 12);
    this.goalGlow.position.set(0, GOAL_H * 0.6, GOAL_LINE_Z);
    this.scene.add(this.goalGlow);

    this.celeLight = new THREE.PointLight("#ffe6a0", 0, 10);
    this.celeLight.position.set(0.55, 3.2, SPOT.z + 0.35);
    this.scene.add(this.celeLight);

    this.celeBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.3),
      new THREE.MeshBasicMaterial({
        map: createCeleBannerTexture(true),
        transparent: true,
        depthTest: false,
      }),
    );
    this.celeBanner.position.set(0, 3.6, SPOT.z - 1);
    this.celeBanner.visible = false;
    this.scene.add(this.celeBanner);

    this.skyBeams = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.08, 4, 6),
        new THREE.MeshBasicMaterial({
          color: "#e8b84a",
          transparent: true,
          opacity: 0.35,
        }),
      );
      beam.position.set((i - 2) * 0.25, 3.5, 0);
      this.skyBeams.add(beam);
    }
    this.skyBeams.visible = false;
    this.scene.add(this.skyBeams);

    poseMessiIdle(this.messi);
    poseKeeperReady(this.keeper, 0);

    this.loadRigs();
  }

  /** Swap procedural characters for the rigged GLTF model when it loads. */
  private loadRigs() {
    createRig(
      "/models/player.glb",
      {
        shirt: "argentina",
        pants: "#0d1116",
        socks: "#f8fafc",
        skin: "#f4d2b0",
        hair: "#1c120c",
      },
      1.72,
    )
      .then((rig) => {
        this.messiRig = rig;
        rig.root.position.set(1.05, 0, SPOT.z + 0.5);
        this.scene.add(rig.root);
        this.messi.root.visible = false;
        rig.play("Idle");
      })
      .catch(() => {
        /* keep procedural fallback */
      });

    createRig(
      "/models/player.glb",
      {
        shirt: "#e0452a",
        pants: "#141414",
        socks: "#e0452a",
        skin: "#a9805c",
        hair: "#141414",
      },
      1.9,
    )
      .then((rig) => {
        this.keeperRig = rig;
        rig.root.position.set(0, 0, GOAL_LINE_Z + 0.55);
        this.scene.add(rig.root);
        this.keeper.root.visible = false;
        rig.play("Idle");
      })
      .catch(() => {
        /* keep procedural fallback */
      });
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  sync(state: GameScene & {
    ballFrom: { x: number; y: number };
    ballTo: { x: number; y: number };
    ballT: number;
  }) {
    const t = this.clock.getElapsedTime();
    const dt = Math.min(0.05, Math.max(0.001, t - this.lastT));
    this.lastT = t;
    const messiCele =
      state.phase === "result" &&
      state.messiCelebrate > 0.1 &&
      state.lastScorerIsMessi;
    const anyGoal = state.phase === "result" && state.goalCelebrate > 0.1;

    // Ball — loft + curl flight (FIFA/PES style)
    if (state.phase === "ball_fly") {
      const p = ballWorldFromNorm(
        state.ballFrom,
        state.ballTo,
        state.ballT,
        state.shotLoft,
        state.shotCurl,
      );
      this.ball.position.copy(p);
      this.ball.rotation.x = state.ballSpin;
      this.ball.rotation.z = state.shotCurl * state.ballT * 2.5;
      this.ball.rotation.y = state.ballSpin * 0.7;
    } else if (state.phase !== "idle" && state.phase !== "match_over") {
      this.ball.position.copy(SPOT);
      this.ball.rotation.set(0, 0, 0);
    }

    // Crosshair on the goal — move pointer to place the shot
    const aiming = state.phase === "aim_shoot" || state.phase === "charge";
    this.aimMarker.visible = aiming && !anyGoal;
    if (aiming) {
      const aim = gameAimToWorld(state.aim.x, state.aim.y);
      this.aimMarker.position.copy(aim);
      this.aimMarker.position.z += 0.06;
      const pulse = 0.92 + Math.sin(t * 6) * 0.08;
      this.aimMarker.scale.setScalar(pulse);
    }

    // Keeper
    // Always commit toward the ball once it's in flight
    const diveActive =
      state.phase === "ball_fly" ||
      (state.phase === "result" && !messiCele && Math.abs(state.gkDive) > 0.02);

    if (this.keeperRig) {
      this.syncKeeperRig(state, t, dt, diveActive);
    } else {
      this.keeper.root.position.x = gkWorldX(state.gkX);
      this.keeper.root.position.z = GOAL_LINE_Z + 0.55;
      if (diveActive) {
        poseKeeperDive(this.keeper, state.gkDive, Math.sign(state.gkDive) || 1);
      } else {
        poseKeeperReady(this.keeper, Math.sin(t * 3));
        this.keeper.root.position.x = gkWorldX(state.gkX);
      }
    }

    // Messi — celebration takes priority
    if (this.messiRig) {
      this.syncMessiRig(state, t, dt, messiCele);
    } else if (messiCele) {
      this.messi.root.position.set(0.9, 0, SPOT.z + 0.4);
      poseMessiSkyPoint(this.messi, state.celebrateT);
    } else {
      this.messi.root.position.set(1.35, 0, SPOT.z + 1.35);
      this.messi.root.rotation.y = Math.PI - 0.28;
      if (state.messiKick > 0.01 || state.phase === "charge") {
        poseMessiKick(this.messi, Math.max(state.messiKick, state.power * 0.35));
      } else {
        poseMessiIdle(this.messi);
        this.messi.root.rotation.y = Math.PI - 0.28;
      }
    }

    // Camera after Messi pose so celebration framing tracks him live
    if (messiCele && this.messiRig) {
      const mp = this.messiRig.root.position;
      const running = state.celebrateT < 1.7;
      const focus = new THREE.Vector3(mp.x, 1.45 + mp.y, mp.z);
      // Chase him while he runs; swing in front for the sky-point
      const camTarget = running
        ? new THREE.Vector3(mp.x + 2.8, 1.9, mp.z + 3.6)
        : new THREE.Vector3(mp.x + 0.4, 1.75, mp.z + 3.9);
      this.camera.position.lerp(camTarget, 0.2);
      this.camera.lookAt(focus);
    } else {
      this.camera.position.set(
        1.5 + Math.sin(t * 0.15) * 0.08,
        2.05,
        15.6,
      );
      this.camera.lookAt(0.35, 1.2, GOAL_LINE_Z + 1.5);
    }

    // Celebration FX
    this.goalGlow.intensity = state.goalCelebrate * (5 + Math.sin(t * 10) * 2);
    this.celeLight.intensity = messiCele ? 8 + Math.sin(t * 12) * 2 : 0;
    this.skyBeams.visible = messiCele;
    if (messiCele && this.messiRig) {
      const mp = this.messiRig.root.position;
      this.skyBeams.position.set(mp.x, 0, mp.z);
      this.skyBeams.rotation.y = t * 0.8;
      this.celeLight.position.set(mp.x, 3.0, mp.z);
    }

    this.celeBanner.visible = anyGoal;
    if (anyGoal) {
      if (this.celeBannerMessi !== state.lastScorerIsMessi) {
        this.celeBannerMessi = state.lastScorerIsMessi;
        const mat = this.celeBanner.material as THREE.MeshBasicMaterial;
        if (mat.map) mat.map.dispose();
        mat.map = createCeleBannerTexture(state.lastScorerIsMessi);
        mat.needsUpdate = true;
      }
      const mp = this.messiRig?.root.position;
      this.celeBanner.position.set(
        messiCele && mp ? mp.x : 0,
        messiCele ? 3.2 : 3.8,
        messiCele && mp ? mp.z + 0.8 : GOAL_LINE_Z + 4,
      );
      this.celeBanner.quaternion.copy(this.camera.quaternion);
      (this.celeBanner.material as THREE.MeshBasicMaterial).opacity =
        Math.min(1, state.goalCelebrate);
    } else {
      this.celeBannerMessi = null;
    }

    if (state.goalCelebrate > 0.15) {
      this.ensureConfetti();
      this.updateConfetti(state.goalCelebrate);
    } else if (this.confetti) {
      this.confetti.visible = false;
    }
  }

  /** Drive the rigged Messi: idle / charge lean / kick swing / sky-point. */
  private syncMessiRig(
    state: GameScene,
    t: number,
    dt: number,
    messiCele: boolean,
  ) {
    const rig = this.messiRig!;
    const b = rig.bones;
    rig.resetPose();

    if (messiCele) {
      this.poseMessiCelebration(rig, state.celebrateT, dt);
      return;
    }

    const MARK = PENALTY_MARK;
    const STRIKE = STRIKE_ROOT;
    // Always face the goal (back to camera) — never spin via atan2 wraps
    const faceGoal = (side = 0) => Math.PI - 0.12 - side * 0.2;
    rig.root.position.set(MARK.x, 0, MARK.z);

    if (state.phase === "run_up") {
      // Jog to the spot; when kick loads, plant and swing into the ball
      const r = state.runUpT;
      const side = state.aim.x - 0.5;
      if (state.messiKick > 0.01) {
        this.poseMessiKick(rig, state.messiKick, side, state.aim.y);
        return;
      }
      // Approach path ends exactly at the strike plant — body stays goal-facing
      const ease = r * r * (3 - 2 * r);
      rig.root.position.set(
        MARK.x + (STRIKE.x - MARK.x) * ease,
        0,
        MARK.z + (STRIKE.z - MARK.z) * ease,
      );
      rig.root.rotation.set(0, faceGoal(side), 0);
      rig.play("Run", 0.1);
      rig.mixer.update(dt);
      return;
    }

    if (state.phase === "ball_fly") {
      this.poseMessiKick(
        rig,
        state.messiKick,
        state.aim.x - 0.5,
        state.aim.y,
      );
      return;
    }

    // Hold the follow-through briefly after contact (before cele / miss pose)
    if (
      state.phase === "result" &&
      state.messiCelebrate === 0 &&
      state.messiKick > KICK_CONTACT
    ) {
      this.poseMessiKick(
        rig,
        Math.min(1, state.messiKick + 0.12),
        state.aim.x - 0.5,
        state.aim.y,
      );
      return;
    }

    if (state.phase === "charge") {
      // Face the goal — camera sees the back of his head
      const side = state.aim.x - 0.5;
      const p = state.power;
      rig.root.rotation.set(0, faceGoal(side), 0);
      if (rig.currentClip) {
        const prev = rig.actions[rig.currentClip];
        if (prev) prev.stop();
        rig.currentClip = "";
      }
      rig.resetPose();
      this.applyPenaltyStance(rig);
      // Coil into the strike as power builds
      rig.offset(b.abdomen, 0.05 + p * 0.12, side * p * 0.06, 0);
      rig.offset(b.upperLegR, -0.1 - p * 0.22, 0, 0);
      rig.offset(b.lowerLegR, 0.14 + p * 0.12, 0, 0);
      rig.offset(b.upperArmL, 0.1 + p * 0.12, 0, 0.06);
      rig.offset(b.upperArmR, 0.1 - p * 0.1, 0, -0.06);
      return;
    }

    if (state.phase === "result" && state.messiCelebrate < 0) {
      // Disappointment — hands to the head, still facing the goal
      rig.root.position.set(STRIKE_ROOT.x, 0, STRIKE_ROOT.z);
      rig.root.rotation.set(0, faceGoal(0), 0);
      if (rig.currentClip) {
        const prev = rig.actions[rig.currentClip];
        if (prev) prev.stop();
        rig.currentClip = "";
      }
      rig.resetPose();
      rig.offset(b.upperArmL, -0.3, 0, 1.1);
      rig.offset(b.upperArmR, -0.3, 0, -1.1);
      rig.offset(b.lowerArmL, -0.9, 0, 0);
      rig.offset(b.lowerArmR, -0.9, 0, 0);
      rig.offset(b.head, 0.2, 0, 0);
      return;
    }

    // Aiming — face the goal, natural ready stance (back of head to camera)
    rig.root.rotation.set(0, faceGoal(0), 0);
    rig.play("Idle", 0.2);
    rig.mixer.update(dt);
    this.applyPenaltyStance(rig);
    void t;
  }

  /**
   * Penalty strike using local-axis offsets from bind pose only.
   * Writing Euler components on this rig stretches the skin — never do that.
   */
  private poseMessiKick(
    rig: Rig,
    kick: number,
    aimSide = 0,
    aimY = 0.45,
  ) {
    const b = rig.bones;
    const k = Math.min(1, Math.max(0, kick));
    const drive = Math.max(0, (k - KICK_CONTACT) / (1 - KICK_CONTACT));
    // Plant next to the ball; small step through after contact
    rig.root.position.set(
      STRIKE_ROOT.x + aimSide * 0.06 * drive,
      0,
      STRIKE_ROOT.z - drive * 0.35,
    );
    // Face the goal only — no pitch/roll on the root
    rig.root.rotation.set(0, Math.PI - 0.14 - aimSide * 0.15, 0);

    if (rig.currentClip) {
      const prev = rig.actions[rig.currentClip];
      if (prev) prev.stop();
      rig.currentClip = "";
    }
    rig.resetPose();

    // swing: -1 backswing → 0 contact → +1 follow-through
    let swing: number;
    if (k < KICK_CONTACT) {
      swing = -Math.sin((k / KICK_CONTACT) * Math.PI * 0.5);
    } else {
      swing = Math.sin(((k - KICK_CONTACT) / (1 - KICK_CONTACT)) * Math.PI * 0.5);
    }

    const loft = Math.min(1, Math.max(0, 1 - (aimY - 0.2) / 0.55));
    const side = Math.max(-0.5, Math.min(0.5, aimSide));

    // Gentle local offsets — clamped so the mesh never shears
    const legSwing = swing * (0.7 + loft * 0.1);
    const knee =
      swing < 0 ? -swing * 0.75 : Math.max(0, 0.25 - swing * 0.15);

    rig.offset(b.upperLegL, -0.12, 0, 0.04);
    rig.offset(b.lowerLegL, 0.18, 0, 0);
    rig.offset(b.footL, 0.06, 0, 0);

    rig.offset(b.upperLegR, legSwing, side * 0.08, -0.05);
    rig.offset(b.lowerLegR, knee, 0, 0);
    rig.offset(b.footR, swing < 0 ? 0.15 : -0.12, 0, 0);

    // Soft torso lean — never yaw the hips hard (that was shredding the shorts)
    rig.offset(b.abdomen, 0.06 + Math.max(0, swing) * 0.18, side * 0.1, 0);
    rig.offset(b.torso, Math.max(0, swing) * 0.08, side * 0.08, 0);

    rig.offset(b.upperArmL, swing * 0.35, 0, 0.12 + Math.abs(swing) * 0.08);
    rig.offset(b.upperArmR, -swing * 0.28, 0, -0.1);
    rig.offset(b.lowerArmL, -0.25, 0, 0);
    rig.offset(b.lowerArmR, -0.2, 0, 0);
    rig.offset(b.head, -0.1, side * 0.06, 0);
  }

  /**
   * Goal celebration: sprint toward camera, then plant and sky-point
   * with perfectly mirrored arms/shoulders.
   */
  private poseMessiCelebration(rig: Rig, celebrateT: number, dt: number) {
    const b = rig.bones;
    const RUN_END = 1.7;
    const from = { x: STRIKE_ROOT.x, z: STRIKE_ROOT.z };
    const to = { x: -0.35, z: SPOT.z + 4.4 };

    if (celebrateT < RUN_END) {
      // Sprint toward camera — turn 180° smoothly (goal → camera), no wrap spin
      const r = Math.min(1, celebrateT / RUN_END);
      const ease = r * r * (3 - 2 * r);
      const x = from.x + (to.x - from.x) * ease;
      const z = from.z + (to.z - from.z) * ease;
      rig.root.position.set(x, 0, z);
      // Math.PI (face goal) → 0 (face camera) along the short arc
      rig.root.rotation.set(0, Math.PI * (1 - ease), 0);
      rig.play("Run", 0.1);
      rig.mixer.update(dt);
      return;
    }

    // Plant facing the camera — iconic sky-point (local offsets only)
    const plantT = celebrateT - RUN_END;
    rig.root.position.set(to.x, 0, to.z);
    rig.root.rotation.set(0, 0, 0);
    if (rig.currentClip) {
      const prev = rig.actions[rig.currentClip];
      if (prev) prev.stop();
      rig.currentClip = "";
    }
    rig.resetPose();

    const raise = Math.min(1, plantT * 3.8);
    const armZ = 1.35 * raise;
    rig.offset(b.upperArmL, -0.35 * raise, 0.04 * raise, armZ);
    rig.offset(b.upperArmR, -0.35 * raise, -0.04 * raise, -armZ);
    rig.offset(b.lowerArmL, 0.35 * raise, 0, 0);
    rig.offset(b.lowerArmR, 0.35 * raise, 0, 0);
    rig.offset(b.palmL, 0, 0, 0);
    rig.offset(b.palmR, 0, 0, 0);
    rig.offset(b.head, -0.35 * raise, 0, 0);
    rig.offset(b.neck, -0.08 * raise, 0, 0);

    const hop =
      plantT < 0.45
        ? Math.sin((plantT / 0.45) * Math.PI) * 0.22
        : 0.02 * Math.sin(plantT * 5.5);
    rig.root.position.y = hop;
    void dt;
  }

  /**
   * Natural pre-penalty ready stance: upright, soft knees, arms at sides.
   * Uses local-axis offsets from rest so the skin stays intact.
   */
  private applyPenaltyStance(rig: Rig) {
    const b = rig.bones;
    rig.offset(b.abdomen, 0, 0, 0);
    rig.offset(b.torso, 0, 0, 0);
    rig.offset(b.neck, 0, 0, 0);
    rig.offset(b.head, 0, 0, 0);
    rig.offset(b.upperLegL, -0.08, 0, 0);
    rig.offset(b.upperLegR, -0.1, 0, 0);
    rig.offset(b.lowerLegL, 0.12, 0, 0);
    rig.offset(b.lowerLegR, 0.14, 0, 0);
    rig.offset(b.upperArmL, 0.1, 0, 0.06);
    rig.offset(b.upperArmR, 0.1, 0, -0.06);
    rig.offset(b.lowerArmL, -0.2, 0, 0);
    rig.offset(b.lowerArmR, -0.2, 0, 0);
    rig.offset(b.palmL, 0.1, 0, 0.06);
    rig.offset(b.palmR, 0.1, 0, -0.06);
  }

  /** Drive the rigged CPU keeper: ready sway or dive toward the ball. */
  private syncKeeperRig(
    state: GameScene,
    t: number,
    dt: number,
    diveActive: boolean,
  ) {
    const rig = this.keeperRig!;
    const b = rig.bones;
    const kx = gkWorldX(state.gkX);
    rig.root.position.z = GOAL_LINE_Z + 0.55;

    if (diveActive) {
      const ballX = gkWorldX(state.ball.x);
      const dx = ballX - kx;
      const dir = Math.sign(dx) || Math.sign(state.gkDive) || 1;
      const a = Math.min(1, Math.abs(dx) / 2.8 + Math.abs(state.gkDive) * 1.2);
      const ballY = Math.max(0.15, 2.2 - state.ball.y * 3.5);
      const high = Math.min(1, Math.max(0, (ballY - 0.9) / 1.2));
      const low = 1 - high;

      if (rig.currentClip) {
        const prev = rig.actions[rig.currentClip];
        if (prev) prev.stop();
        rig.currentClip = "";
      }
      rig.resetPose();
      rig.root.position.x = kx;
      rig.root.position.y = -a * (0.1 + low * 0.3) + high * 0.08;
      rig.root.rotation.set(0, 0, -dir * a * (0.5 + low * 0.18));

      const reach = (1.0 + high * 0.3) * a;
      if (dir < 0) {
        rig.offset(b.upperArmL, -0.15 * a, 0, reach);
        rig.offset(b.upperArmR, -0.1 * a, 0, -0.55 * a);
        rig.offset(b.lowerArmL, -0.2 * high, 0, 0);
      } else {
        rig.offset(b.upperArmR, -0.15 * a, 0, -reach);
        rig.offset(b.upperArmL, -0.1 * a, 0, 0.55 * a);
        rig.offset(b.lowerArmR, -0.2 * high, 0, 0);
      }
      rig.offset(b.head, -high * 0.15, dir * 0.12 * a, 0);
      rig.offset(b.upperLegL, -a * (0.12 + low * 0.15), 0, 0);
      rig.offset(b.upperLegR, -a * (0.12 + low * 0.15), 0, 0);
      rig.offset(b.lowerLegL, a * 0.25, 0, 0);
      rig.offset(b.lowerLegR, a * 0.22, 0, 0);
      return;
    }

    // Ready stance — Idle + light crouch offsets
    rig.resetPose();
    rig.root.rotation.set(0, 0, 0);
    rig.root.position.y = 0;
    const shuffle =
      state.phase === "charge" || state.phase === "aim_shoot"
        ? (state.aim.x - 0.5) * 0.35
        : 0;
    rig.root.position.x = kx + shuffle * 0.15;
    rig.play("Idle", 0.12);
    rig.mixer.update(dt);
    const bob = Math.sin(t * 3) * 0.04;
    rig.offset(b.head, -0.15, shuffle * 0.2, 0);
    rig.offset(b.upperLegL, -0.18, 0, 0);
    rig.offset(b.upperLegR, -0.18, 0, 0);
    rig.offset(b.lowerLegL, 0.28, 0, 0);
    rig.offset(b.lowerLegR, 0.28, 0, 0);
    rig.offset(b.upperArmL, 0, 0, 0.45 + bob);
    rig.offset(b.upperArmR, 0, 0, -0.45 - bob);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private buildLights() {
    const amb = new THREE.AmbientLight("#9eb6c8", 0.52);
    this.scene.add(amb);

    const hemi = new THREE.HemisphereLight("#c5ddf0", "#1a4030", 0.6);
    this.scene.add(hemi);

    // Soft fill from behind the camera so Messi's kit / skin read clearly
    const fill = new THREE.DirectionalLight("#dce9f5", 0.45);
    fill.position.set(2, 4, 14);
    this.scene.add(fill);

    const sun = new THREE.DirectionalLight("#fff5d6", 1.4);
    sun.position.set(-6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    this.scene.add(sun);

    for (const sx of [-1, 1]) {
      const flood = new THREE.SpotLight("#fff2c8", 40, 45, 0.45, 0.4);
      flood.position.set(sx * 12, 12, 2);
      flood.target.position.set(0, 0, GOAL_LINE_Z);
      flood.castShadow = true;
      this.scene.add(flood);
      this.scene.add(flood.target);
    }
  }

  private buildStadium() {
    // Stand bowl
    const standMat = new THREE.MeshStandardMaterial({
      color: "#1a2433",
      roughness: 0.9,
    });
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 26, 8, 48, 1, true),
      standMat,
    );
    stand.position.y = 3;
    stand.position.z = -2;
    this.scene.add(stand);

    // Crowd dots as instanced-ish points
    const crowdGeo = new THREE.BufferGeometry();
    const n = 2200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const colors = [
      [0.76, 0.23, 0.16],
      [0.91, 0.72, 0.29],
      [0.95, 0.97, 0.95],
      [0.16, 0.44, 0.86],
    ];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 1.6 + 0.2;
      const r = 20 + (i % 5) * 0.7;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 1.5 + (i % 7) * 0.55;
      pos[i * 3 + 2] = Math.sin(a) * r * 0.7 - 4;
      const c = colors[i % colors.length];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    crowdGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    crowdGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    // Soft round dots — default Points are square pixels
    const crowd = new THREE.Points(
      crowdGeo,
      new THREE.PointsMaterial({
        size: 0.22,
        vertexColors: true,
        map: softDotTexture(),
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
        opacity: 0.9,
      }),
    );
    this.scene.add(crowd);

    // Ad boards
    const ad = new THREE.Mesh(
      new THREE.BoxGeometry(PITCH_W * 0.9, 0.6, 0.15),
      new THREE.MeshStandardMaterial({ color: "#0b3d2e", roughness: 0.5 }),
    );
    ad.position.set(0, 0.35, GOAL_LINE_Z - 1.2);
    this.scene.add(ad);
  }

  private buildPitch() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const g = canvas.getContext("2d")!;
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 === 0 ? "#178a52" : "#126b40";
      g.fillRect(0, i * 32, 512, 32);
    }
    g.strokeStyle = "rgba(244,247,242,0.85)";
    g.lineWidth = 4;
    g.strokeRect(80, 40, 352, 200);
    g.strokeRect(160, 40, 192, 80);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH_W, PITCH_D),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
      }),
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Spot mark
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 20),
      new THREE.MeshStandardMaterial({ color: "#f4f7f2", roughness: 0.6 }),
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(SPOT.x, 0.02, SPOT.z);
    this.scene.add(spot);
  }

  private buildGoal() {
    const postMat = new THREE.MeshStandardMaterial({
      color: "#f2f4f6",
      roughness: 0.35,
      metalness: 0.2,
    });
    const r = 0.07;
    const left = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, GOAL_H, 12),
      postMat,
    );
    left.position.set(-GOAL_HALF_W, GOAL_H / 2, GOAL_LINE_Z);
    left.castShadow = true;
    this.scene.add(left);

    const right = left.clone();
    right.position.x = GOAL_HALF_W;
    this.scene.add(right);

    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, GOAL_HALF_W * 2 + 0.1, 12),
      postMat,
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, GOAL_H, GOAL_LINE_Z);
    bar.castShadow = true;
    this.scene.add(bar);

    // Net
    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(GOAL_HALF_W * 2, GOAL_H),
      new THREE.MeshStandardMaterial({
        color: "#d0d8de",
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        wireframe: true,
      }),
    );
    net.position.set(0, GOAL_H / 2, GOAL_LINE_Z - 0.05);
    this.scene.add(net);

    // Back net depth
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(GOAL_HALF_W * 1.7, GOAL_H * 0.9),
      new THREE.MeshStandardMaterial({
        color: "#c5ced4",
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        wireframe: true,
      }),
    );
    back.position.set(0, GOAL_H / 2 - 0.05, GOAL_LINE_Z - 1.4);
    this.scene.add(back);
  }

  /** Modern FIFA World Cup–style match ball (connected panels + gold accents). */
  private createBall() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext("2d")!;

    // Bright white match-ball base
    const base = g.createRadialGradient(
      size * 0.32,
      size * 0.28,
      8,
      size * 0.5,
      size * 0.5,
      size * 0.72,
    );
    base.addColorStop(0, "#ffffff");
    base.addColorStop(0.5, "#f7f9f8");
    base.addColorStop(1, "#e8ece8");
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);

    // Flowing connected "propeller" panels — modern WC look
    const drawBlade = (
      cx: number,
      cy: number,
      r: number,
      rot: number,
      fill: string,
    ) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(0, -r * 0.15);
      g.bezierCurveTo(r * 0.55, -r * 0.9, r * 0.95, -r * 0.35, r * 0.7, r * 0.15);
      g.bezierCurveTo(r * 0.4, r * 0.55, r * 0.1, r * 0.35, 0, r * 0.1);
      g.bezierCurveTo(-r * 0.1, r * 0.35, -r * 0.4, r * 0.55, -r * 0.7, r * 0.15);
      g.bezierCurveTo(-r * 0.95, -r * 0.35, -r * 0.55, -r * 0.9, 0, -r * 0.15);
      g.closePath();
      g.fillStyle = fill;
      g.fill();
      g.strokeStyle = "rgba(10,20,30,0.35)";
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    };

    const hubs: Array<[number, number, number]> = [
      [0.5, 0.28, 0],
      [0.28, 0.48, 0.7],
      [0.72, 0.48, -0.7],
      [0.38, 0.72, 1.2],
      [0.62, 0.72, -1.2],
      [0.5, 0.52, 0.35],
      [0.15, 0.35, 0.4],
      [0.85, 0.35, -0.4],
      [0.2, 0.7, 1.5],
      [0.8, 0.7, -1.5],
    ];
    for (const [ux, uy, rot] of hubs) {
      drawBlade(ux * size, uy * size, size * 0.13, rot, "#0b1c2e");
      drawBlade(ux * size, uy * size, size * 0.08, rot + 0.5, "#1a3a5c");
    }

    // Gold accent ribbons
    g.strokeStyle = "rgba(232,184,74,0.85)";
    g.lineWidth = 5;
    g.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const y0 = size * (0.18 + i * 0.12);
      g.beginPath();
      g.moveTo(size * 0.05, y0);
      for (let x = 0; x <= size; x += 12) {
        g.lineTo(x, y0 + Math.sin(x * 0.03 + i * 1.2) * 14);
      }
      g.stroke();
    }

    // Celeste secondary seams (WC26 / host-region nod)
    g.strokeStyle = "rgba(116,172,223,0.55)";
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const y0 = size * (0.25 + i * 0.18);
      g.beginPath();
      g.moveTo(0, y0);
      for (let x = 0; x <= size; x += 14) {
        g.lineTo(x, y0 + Math.cos(x * 0.035 + i) * 10);
      }
      g.stroke();
    }

    // Centre FIFA-style badge
    g.beginPath();
    g.arc(size * 0.5, size * 0.5, size * 0.07, 0, Math.PI * 2);
    g.fillStyle = "#e8b84a";
    g.fill();
    g.beginPath();
    g.arc(size * 0.5, size * 0.5, size * 0.052, 0, Math.PI * 2);
    g.fillStyle = "#0a2540";
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `bold ${Math.round(size * 0.032)}px Sora, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("WC", size * 0.5, size * 0.485);
    g.font = `bold ${Math.round(size * 0.026)}px Sora, sans-serif`;
    g.fillStyle = "#e8b84a";
    g.fillText("26", size * 0.5, size * 0.525);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.118, 48, 48),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.32,
        metalness: 0.12,
      }),
    );
    ball.castShadow = true;
    return ball;
  }

  /** Compact gold ring on the goal — where the shot is aimed. */
  private createAimReticle() {
    const g = new THREE.Group();
    g.name = "AimReticle";
    const mat = new THREE.MeshBasicMaterial({
      color: "#f0d060",
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      side: THREE.DoubleSide,
    });
    g.add(new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 40), mat));
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), mat));
    g.visible = false;
    return g;
  }

  private ensureConfetti() {
    if (this.confetti) {
      this.confetti.visible = true;
      return;
    }
    const n = 180;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const palette = [
      [0.91, 0.72, 0.29],
      [0.45, 0.67, 0.87],
      [0.95, 0.97, 0.95],
      [0.91, 0.35, 0.54],
    ];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = GOAL_LINE_Z + Math.random() * 6;
      const c = palette[i % palette.length];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.confetti = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        map: softDotTexture(),
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.scene.add(this.confetti);
  }

  private updateConfetti(intensity: number) {
    if (!this.confetti) return;
    const pos = this.confetti.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - 0.04 * intensity;
      if (y < 0) y = 3 + Math.random() * 2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(i + y) * 0.01);
    }
    pos.needsUpdate = true;
  }
}
