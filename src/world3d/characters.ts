import * as THREE from "three";
import { createMessiModel } from "./messiModel.ts";

function mat(color: string, opts: { rough?: number; metal?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.65,
    metalness: opts.metal ?? 0.05,
  });
}

export type Humanoid = {
  root: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftHand: THREE.Object3D;
  rightHand: THREE.Object3D;
  leftFinger?: THREE.Object3D;
  rightFinger?: THREE.Object3D;
};

function makeLimb(
  length: number,
  radius: number,
  color: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 4, 8),
    mat(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createMessi(): Humanoid {
  return createMessiModel();
}

export function createKeeper(): Humanoid {
  const root = new THREE.Group();
  root.name = "keeper";

  const shorts = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.24),
    mat("#151c28"),
  );
  shorts.position.y = 0.98;
  shorts.castShadow = true;
  root.add(shorts);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.58, 0.26),
    mat("#e04532"),
  );
  torso.position.y = 1.38;
  torso.castShadow = true;
  root.add(torso);

  // Number
  const numCanvas = document.createElement("canvas");
  numCanvas.width = 64;
  numCanvas.height = 64;
  const ng = numCanvas.getContext("2d")!;
  ng.fillStyle = "#e04532";
  ng.fillRect(0, 0, 64, 64);
  ng.fillStyle = "#f4f7f2";
  ng.font = "bold 48px Anton, Impact, sans-serif";
  ng.textAlign = "center";
  ng.textBaseline = "middle";
  ng.fillText("1", 32, 34);
  const numTex = new THREE.CanvasTexture(numCanvas);
  numTex.colorSpace = THREE.SRGBColorSpace;
  const numPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.24),
    new THREE.MeshStandardMaterial({ map: numTex, roughness: 0.5 }),
  );
  numPlate.position.set(0, 1.38, 0.135);
  root.add(numPlate);

  const head = new THREE.Group();
  head.position.y = 1.82;
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 16),
    mat("#d9a878"),
  );
  skull.castShadow = true;
  head.add(skull);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mat("#151c28"),
  );
  cap.position.y = 0.02;
  head.add(cap);
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.02, 0.1),
    mat("#e04532"),
  );
  brim.position.set(0, 0.02, 0.1);
  head.add(brim);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      mat("#1a1410"),
    );
    eye.position.set(sx * 0.05, 0.015, 0.12);
    head.add(eye);
  }
  root.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.3, 1.55, 0);
  const la = makeLimb(0.4, 0.05, "#d9a878");
  la.position.y = -0.24;
  leftArm.add(la);
  const ls = makeLimb(0.14, 0.06, "#e04532");
  ls.position.y = -0.06;
  leftArm.add(ls);
  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    mat("#e8b84a", { rough: 0.4 }),
  );
  leftHand.position.y = -0.52;
  leftArm.add(leftHand);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.3, 1.55, 0);
  const ra = makeLimb(0.4, 0.05, "#d9a878");
  ra.position.y = -0.24;
  rightArm.add(ra);
  const rs = makeLimb(0.14, 0.06, "#e04532");
  rs.position.y = -0.06;
  rightArm.add(rs);
  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    mat("#e8b84a", { rough: 0.4 }),
  );
  rightHand.position.y = -0.52;
  rightArm.add(rightHand);
  root.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.11, 0.98, 0);
  const ll = makeLimb(0.55, 0.06, "#151c28");
  ll.position.y = -0.35;
  leftLeg.add(ll);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), mat("#0a0a0a"));
  bootL.position.set(0, -0.78, 0.04);
  leftLeg.add(bootL);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.11, 0.98, 0);
  const rl = makeLimb(0.55, 0.06, "#151c28");
  rl.position.y = -0.35;
  rightLeg.add(rl);
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), mat("#0a0a0a"));
  bootR.position.set(0, -0.78, 0.04);
  rightLeg.add(bootR);
  root.add(rightLeg);

  return {
    root,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftHand,
    rightHand,
  };
}

export function poseMessiIdle(h: Humanoid) {
  h.leftArm.rotation.set(0.15, 0, 0.25);
  h.rightArm.rotation.set(0.15, 0, -0.25);
  h.leftLeg.rotation.set(0.05, 0, 0);
  h.rightLeg.rotation.set(-0.05, 0, 0);
  h.head.rotation.set(0, 0, 0);
  h.leftHand.rotation.set(0, 0, 0);
  h.rightHand.rotation.set(0, 0, 0);
}

/**
 * Idle / aim facing. Model face is on local +Z and the camera sits at world +Z,
 * so yaw 0 = facing camera. Use a ¾ view so the face reads while aiming.
 */
export const MESSI_FACE_YAW = 0.65;

export function poseMessiKick(h: Humanoid, kick: number) {
  poseMessiIdle(h);
  h.leftLeg.rotation.x = -0.2 - kick * 1.1;
  h.rightLeg.rotation.x = 0.15;
  h.leftArm.rotation.x = -0.4 * kick;
  h.rightArm.rotation.x = 0.3 * kick;
  // Turn toward the goal as the strike progresses
  h.root.rotation.y = MESSI_FACE_YAW + (Math.PI - MESSI_FACE_YAW) * kick;
}

/** Iconic Messi celebration — both index fingers to the sky. */
export function poseMessiSkyPoint(h: Humanoid, t: number) {
  const raise = Math.min(1, 0.35 + t * 4);
  h.leftArm.rotation.set(-Math.PI * 0.95 * raise, 0.05, 0.2);
  h.rightArm.rotation.set(-Math.PI * 0.98 * raise, -0.05, -0.2);
  h.leftHand.rotation.set(0, 0, 0);
  h.rightHand.rotation.set(0, 0, 0);
  h.leftLeg.rotation.set(0.08, 0, 0.05);
  h.rightLeg.rotation.set(-0.05, 0, -0.05);
  h.head.rotation.set(-0.45 * raise, 0, 0);
  const hop = t < 0.4 ? Math.sin((t / 0.4) * Math.PI) * 0.35 : 0.04 * Math.sin(t * 5);
  h.root.position.y = hop;
  // Face the camera fully for the sky-point
  h.root.rotation.y = 0.1;
}

export function poseKeeperReady(h: Humanoid, bob: number) {
  h.root.position.y = bob * 0.03;
  h.leftArm.rotation.set(-0.5, 0, 0.6);
  h.rightArm.rotation.set(-0.5, 0, -0.6);
  h.leftLeg.rotation.set(0.25, 0, 0.08);
  h.rightLeg.rotation.set(0.25, 0, -0.08);
  h.root.rotation.z = 0;
  h.root.rotation.x = 0;
}

export function poseKeeperDive(h: Humanoid, dive: number, dir: number) {
  const a = Math.min(1, Math.abs(dive) * 2.5);
  h.root.rotation.z = -dir * a * 1.1;
  h.root.rotation.x = a * 0.35;
  h.root.position.y = -a * 0.35;
  h.leftArm.rotation.set(-1.2 - a, 0, 0.8 + a);
  h.rightArm.rotation.set(-1.2 - a, 0, -0.8 - a);
  h.leftLeg.rotation.set(0.6 * a, 0, 0.3);
  h.rightLeg.rotation.set(0.4 * a, 0, -0.3);
}
