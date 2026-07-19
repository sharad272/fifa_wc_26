import * as THREE from "three";
import type { Humanoid } from "./characters.ts";

function mat(color: string, opts: { rough?: number; metal?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.62,
    metalness: opts.metal ?? 0.04,
  });
}

function limb(len: number, r: number, color: string) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 10), mat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function kitTexture(face: "front" | "back") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 === 0 ? "#6ba8d9" : "#f7faf6";
    g.fillRect(i * 25.6, 0, 26, 256);
  }
  // Soft sheen
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fillRect(0, 0, 80, 256);
  g.fillStyle = "#0f1a14";
  g.font = "bold 92px Anton, Impact, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("10", 128, face === "front" ? 140 : 130);
  if (face === "back") {
    g.font = "bold 22px Sora, sans-serif";
    g.fillText("MESSI", 128, 55);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pointingHand() {
  const hand = new THREE.Group();
  hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), mat("#d9a878")));
  const finger = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.011, 0.1, 4, 6),
    mat("#d9a878"),
  );
  finger.position.y = 0.1;
  hand.add(finger);
  return { hand, finger };
}

/** Recognizable stylized Messi — face visible, not a black ball head. */
export function createMessiModel(): Humanoid {
  const root = new THREE.Group();
  root.name = "messi";
  root.scale.setScalar(0.95);

  // --- Lower body ---
  const hips = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.12, 6, 12),
    mat("#141414"),
  );
  hips.position.y = 0.92;
  hips.scale.set(1.15, 1, 0.85);
  hips.castShadow = true;
  root.add(hips);

  // --- Torso (rounded, not a brick) ---
  const torsoG = new THREE.Group();
  torsoG.position.y = 1.28;
  const chest = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.28, 8, 16),
    new THREE.MeshStandardMaterial({
      map: kitTexture("front"),
      roughness: 0.5,
    }),
  );
  chest.scale.set(1.05, 1, 0.75);
  chest.castShadow = true;
  torsoG.add(chest);

  // Back number plate so rear view still reads MESSI 10
  const backKit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.42),
    new THREE.MeshStandardMaterial({
      map: kitTexture("back"),
      roughness: 0.5,
    }),
  );
  backKit.position.set(0, 0.02, -0.16);
  backKit.rotation.y = Math.PI;
  torsoG.add(backKit);

  // Captain armband
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.018, 8, 16),
    mat("#e8b84a", { metal: 0.35, rough: 0.4 }),
  );
  band.position.set(-0.22, 0.05, 0);
  band.rotation.z = Math.PI / 2;
  torsoG.add(band);
  root.add(torsoG);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12),
    mat("#d9a878"),
  );
  neck.position.y = 1.62;
  root.add(neck);

  // --- HEAD (skin skull + hair on top only + face) ---
  const head = new THREE.Group();
  head.position.y = 1.78;

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 24, 24),
    mat("#e0b890", { rough: 0.72 }),
  );
  skull.castShadow = true;
  head.add(skull);

  // Ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 10, 10),
      mat("#d4a574"),
    );
    ear.position.set(sx * 0.12, 0, 0);
    ear.scale.set(0.55, 1, 0.7);
    head.add(ear);
  }

  // Nose
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 10, 10),
    mat("#c9956a"),
  );
  nose.position.set(0, -0.01, 0.12);
  nose.scale.set(0.7, 1.1, 1.2);
  head.add(nose);

  // Hair — dark brown cap on TOP only, tilted back so the forehead shows
  const hairMat = mat("#2a1c14");
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.4),
    hairMat,
  );
  hairCap.position.y = 0.035;
  hairCap.rotation.x = 0.18;
  head.add(hairCap);

  // Short fringe high on the forehead (doesn't cover the face)
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), hairMat);
  fringe.position.set(0, 0.1, 0.075);
  fringe.scale.set(1.5, 0.5, 0.6);
  head.add(fringe);
  for (const sx of [-1, 1]) {
    const wave = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), hairMat);
    wave.position.set(sx * 0.1, 0.075, -0.025);
    wave.scale.set(0.65, 0.85, 0.75);
    head.add(wave);
  }

  // Beard along the jaw only
  const beard = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 16, 12, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.3),
    mat("#3b2a1f"),
  );
  beard.position.set(0, -0.015, 0.012);
  beard.scale.set(0.96, 1, 0.96);
  head.add(beard);

  // Mustache
  const stache = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), mat("#3b2a1f"));
  stache.position.set(0, -0.055, 0.108);
  stache.scale.set(1.6, 0.5, 0.6);
  head.add(stache);

  // 3D facial features that protrude past the skull surface
  for (const sx of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), mat("#f7faf6"));
    white.position.set(sx * 0.048, 0.02, 0.112);
    white.scale.set(1, 1.15, 0.6);
    head.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), mat("#2a1a10"));
    pupil.position.set(sx * 0.048, 0.018, 0.128);
    head.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.015), mat("#2a1c14"));
    brow.position.set(sx * 0.05, 0.055, 0.115);
    brow.rotation.z = sx * -0.15;
    head.add(brow);
  }

  root.add(head);

  // --- Arms ---
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.26, 1.48, 0);
  const ls = limb(0.14, 0.05, "#6ba8d9");
  ls.position.y = -0.08;
  leftArm.add(ls);
  const la = limb(0.34, 0.042, "#d9a878");
  la.position.y = -0.28;
  leftArm.add(la);
  const { hand: leftHand, finger: leftFinger } = pointingHand();
  leftHand.position.y = -0.5;
  leftArm.add(leftHand);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.26, 1.48, 0);
  const rs = limb(0.14, 0.05, "#6ba8d9");
  rs.position.y = -0.08;
  rightArm.add(rs);
  const ra = limb(0.34, 0.042, "#d9a878");
  ra.position.y = -0.28;
  rightArm.add(ra);
  const { hand: rightHand, finger: rightFinger } = pointingHand();
  rightHand.position.y = -0.5;
  rightArm.add(rightHand);
  root.add(rightArm);

  // --- Legs ---
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.09, 0.9, 0);
  const ll = limb(0.48, 0.052, "#141414");
  ll.position.y = -0.32;
  leftLeg.add(ll);
  const sockL = limb(0.16, 0.048, "#f4f7f2");
  sockL.position.y = -0.58;
  leftLeg.add(sockL);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), mat("#0a0a0a"));
  bootL.position.set(0, -0.72, 0.03);
  bootL.castShadow = true;
  leftLeg.add(bootL);
  const pinkL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.07), mat("#e85a8a"));
  pinkL.position.set(0, -0.72, 0.11);
  leftLeg.add(pinkL);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.09, 0.9, 0);
  const rl = limb(0.48, 0.052, "#141414");
  rl.position.y = -0.32;
  rightLeg.add(rl);
  const sockR = limb(0.16, 0.048, "#f4f7f2");
  sockR.position.y = -0.58;
  rightLeg.add(sockR);
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), mat("#0a0a0a"));
  bootR.position.set(0, -0.72, 0.03);
  bootR.castShadow = true;
  rightLeg.add(bootR);
  const pinkR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.07), mat("#e85a8a"));
  pinkR.position.set(0, -0.72, 0.11);
  rightLeg.add(pinkR);
  root.add(rightLeg);

  return {
    root,
    torso: torsoG,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftHand,
    rightHand,
    leftFinger,
    rightFinger,
  };
}
