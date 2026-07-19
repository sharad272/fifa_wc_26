import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

/** Named bones of the Quaternius human rig (dots stripped by the loader). */
export interface RigBones {
  head?: THREE.Object3D;
  neck?: THREE.Object3D;
  torso?: THREE.Object3D;
  abdomen?: THREE.Object3D;
  hips?: THREE.Object3D;
  shoulderL?: THREE.Object3D;
  shoulderR?: THREE.Object3D;
  upperArmL?: THREE.Object3D;
  lowerArmL?: THREE.Object3D;
  upperArmR?: THREE.Object3D;
  lowerArmR?: THREE.Object3D;
  upperLegL?: THREE.Object3D;
  lowerLegL?: THREE.Object3D;
  upperLegR?: THREE.Object3D;
  lowerLegR?: THREE.Object3D;
  footL?: THREE.Object3D;
  footR?: THREE.Object3D;
  palmL?: THREE.Object3D;
  palmR?: THREE.Object3D;
}

export interface Rig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  bones: RigBones;
  /** Crossfade to a clip (short names: Idle, Run, Jump, ...). */
  play(name: string, fadeSec?: number): void;
  /**
   * Restore every bone to its rest rotation. Call BEFORE mixer.update each
   * frame so per-frame pose offsets never accumulate on bones the active
   * clip doesn't animate.
   */
  resetPose(): void;
  /** Restore ONE bone to rest AFTER mixer.update, overriding the clip. */
  rest(bone: THREE.Object3D | undefined): void;
  /**
   * Apply a small local-axis offset from rest (rotateX/Y/Z). Safer than
   * writing Euler components on Quaternius bones, which breaks the skin.
   */
  offset(
    bone: THREE.Object3D | undefined,
    rx?: number,
    ry?: number,
    rz?: number,
  ): void;
  currentClip: string;
}

export interface RigColors {
  /** "argentina" paints albiceleste stripes via vertex colors. */
  shirt: string | "argentina";
  pants: string;
  socks: string;
  skin: string;
  hair: string;
}

const BONE_LOOKUP: Array<[keyof RigBones, string]> = [
  ["head", "head"],
  ["neck", "neck"],
  ["torso", "torso"],
  ["abdomen", "abdomen"],
  ["hips", "hips"],
  ["shoulderL", "shoulderl"],
  ["shoulderR", "shoulderr"],
  ["upperArmL", "upperarml"],
  ["lowerArmL", "lowerarml"],
  ["upperArmR", "upperarmr"],
  ["lowerArmR", "lowerarmr"],
  ["upperLegL", "upperlegl"],
  ["lowerLegL", "lowerlegl"],
  ["upperLegR", "upperlegr"],
  ["lowerLegR", "lowerlegr"],
  ["footL", "footl"],
  ["footR", "footr"],
  ["palmL", "palml"],
  ["palmR", "palmr"],
];

let basePromise: Promise<{
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}> | null = null;

function loadBase(url: string) {
  if (!basePromise) {
    basePromise = new GLTFLoader()
      .loadAsync(url)
      .then((g) => ({ scene: g.scene, animations: g.animations }));
  }
  return basePromise;
}

function normName(n: string) {
  return n.replace(/[^a-z]/gi, "").toLowerCase();
}

/**
 * Paint Argentina albiceleste vertical stripes (celeste + white).
 * Mesh has no UVs, so we use bind-pose vertex X for stripe bands.
 */
function stripeShirt(mesh: THREE.Mesh) {
  // Own geometry so Messi/keeper clones don't fight over vertex colours
  mesh.geometry = mesh.geometry.clone();
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const minX = bb.min.x;
  const w = Math.max(1e-5, bb.max.x - minX);
  const midY = (bb.min.y + bb.max.y) * 0.5;
  const colors = new Float32Array(pos.count * 3);
  // Argentina home: celestial blue + white
  const celeste = new THREE.Color("#6bb8e8");
  const white = new THREE.Color("#ffffff");
  const gold = new THREE.Color("#e0b040");
  const stripeCount = 7; // clear vertical bands like the real kit
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (x - minX) / w;
    const band = Math.min(stripeCount - 1, Math.floor(t * stripeCount));
    let c = band % 2 === 0 ? celeste : white;
    // Sol de Mayo — small gold badge on the chest
    const onChest =
      z > (bb.min.z + bb.max.z) * 0.5 &&
      Math.abs(t - 0.5) < 0.1 &&
      y > midY &&
      y < midY + (bb.max.y - bb.min.y) * 0.2;
    if (onChest) c = gold;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.set("#ffffff");
  mat.vertexColors = true;
  mat.roughness = 0.48;
  mat.metalness = 0.04;
  mat.needsUpdate = true;
}

export async function createRig(
  url: string,
  colors: RigColors,
  targetHeight = 1.8,
): Promise<Rig> {
  const base = await loadBase(url);
  const inner = skeletonClone(base.scene) as THREE.Group;
  const root = new THREE.Group();
  root.add(inner);

  // Recolor per-part materials (clone so instances don't share)
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Skinned bounds are computed in bind pose; never cull the player
    mesh.frustumCulled = false;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const mat = src.clone();
    mesh.material = mat;
    const name = (mat.name || "").toLowerCase();
    if (name === "shirt" || name.includes("shirt") || name.includes("torso")) {
      if (colors.shirt === "argentina") stripeShirt(mesh);
      else mat.color.set(colors.shirt);
    } else if (name === "pants" || name.includes("short")) {
      mat.color.set(colors.pants);
      mat.roughness = 0.72;
    } else if (name === "socks" || name.includes("sock")) {
      mat.color.set(colors.socks);
      mat.roughness = 0.65;
    } else if (name === "skin") {
      mat.color.set(colors.skin);
      mat.roughness = 0.62;
      mat.metalness = 0.02;
    } else if (name === "hair") {
      mat.color.set(colors.hair);
      mat.roughness = 0.85;
    } else if (name === "eyes") {
      mat.color.set("#1a120c");
      mat.roughness = 0.35;
    }
  });

  // Bone lookup by normalized name
  const bones: RigBones = {};
  inner.traverse((o) => {
    const n = normName(o.name);
    for (const [key, want] of BONE_LOOKUP) {
      if (!bones[key] && n === want) bones[key] = o;
    }
  });

  // Normalize size from the SKELETON (head↔foot bones). The armature carries
  // a baked ×100 scale, so mesh-geometry bounding boxes are misleading.
  root.updateMatrixWorld(true);
  const headPos = new THREE.Vector3();
  const footPos = new THREE.Vector3();
  if (bones.head && bones.footL) {
    bones.head.getWorldPosition(headPos);
    bones.footL.getWorldPosition(footPos);
    // head bone sits at skull base; add ~18% for the skull itself
    const skel = Math.max(1e-5, (headPos.y - footPos.y) * 1.18);
    const s = targetHeight / skel;
    inner.scale.setScalar(s);
    root.updateMatrixWorld(true);
    // Drop feet to the turf (foot bone is the ankle, ~4% of height up)
    bones.footL.getWorldPosition(footPos);
    inner.position.y = -footPos.y + targetHeight * 0.045;
  }

  // Snapshot rest rotations of every node so pose offsets can be undone
  const restMap = new Map<THREE.Object3D, THREE.Quaternion>();
  inner.traverse((o) => {
    restMap.set(o, o.quaternion.clone());
  });

  const mixer = new THREE.AnimationMixer(inner);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of base.animations) {
    // "HumanArmature|Man_Idle" -> "Idle"
    const short = clip.name.split("_").pop() ?? clip.name;
    actions[short] = mixer.clipAction(clip);
  }

  const rig: Rig = {
    root,
    mixer,
    actions,
    bones,
    currentClip: "",
    play(name: string, fadeSec = 0.18) {
      if (rig.currentClip === name) return;
      const next = actions[name];
      if (!next) return;
      const prev = actions[rig.currentClip];
      next.reset().fadeIn(fadeSec).play();
      if (prev) prev.fadeOut(fadeSec);
      rig.currentClip = name;
    },
    resetPose() {
      for (const [o, q] of restMap) o.quaternion.copy(q);
    },
    rest(bone) {
      if (!bone) return;
      const q = restMap.get(bone);
      if (q) bone.quaternion.copy(q);
    },
    offset(bone, rx = 0, ry = 0, rz = 0) {
      if (!bone) return;
      const q = restMap.get(bone);
      if (q) bone.quaternion.copy(q);
      else bone.quaternion.identity();
      if (rx) bone.rotateX(rx);
      if (ry) bone.rotateY(ry);
      if (rz) bone.rotateZ(rz);
    },
  };
  return rig;
}
