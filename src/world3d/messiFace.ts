import * as THREE from "three";

/** Painted Messi-like face card for the 3D head. */
export function createMessiFaceTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;

  // Skin
  const skin = g.createRadialGradient(120, 120, 20, 128, 140, 140);
  skin.addColorStop(0, "#f0d0b0");
  skin.addColorStop(0.6, "#d4a574");
  skin.addColorStop(1, "#b88458");
  g.fillStyle = skin;
  g.fillRect(0, 0, 256, 256);

  // Hair (wavy dark, Messi-style fringe)
  g.fillStyle = "#1a1410";
  g.beginPath();
  g.ellipse(128, 70, 95, 70, 0, Math.PI, 0);
  g.fill();
  g.beginPath();
  g.ellipse(70, 85, 40, 35, -0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(185, 80, 42, 36, 0.35, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(128, 55, 55, 40, 0, 0, Math.PI * 2);
  g.fill();

  // Brows
  g.strokeStyle = "#2a1c14";
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(78, 118);
  g.quadraticCurveTo(100, 108, 118, 114);
  g.moveTo(138, 114);
  g.quadraticCurveTo(156, 108, 178, 118);
  g.stroke();

  // Eyes
  g.fillStyle = "#fff";
  g.beginPath();
  g.ellipse(100, 130, 16, 18, 0, 0, Math.PI * 2);
  g.ellipse(156, 130, 16, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#3a2818";
  g.beginPath();
  g.arc(100, 132, 8, 0, Math.PI * 2);
  g.arc(156, 132, 8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0a0806";
  g.beginPath();
  g.arc(100, 132, 4, 0, Math.PI * 2);
  g.arc(156, 132, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(103, 129, 2, 0, Math.PI * 2);
  g.arc(159, 129, 2, 0, Math.PI * 2);
  g.fill();

  // Nose
  g.strokeStyle = "rgba(120,80,50,0.55)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(128, 138);
  g.lineTo(120, 168);
  g.lineTo(136, 168);
  g.stroke();

  // Beard / stubble
  const beard = g.createLinearGradient(128, 170, 128, 230);
  beard.addColorStop(0, "rgba(60,40,28,0.35)");
  beard.addColorStop(0.4, "rgba(45,30,20,0.85)");
  beard.addColorStop(1, "rgba(30,20,14,0.95)");
  g.fillStyle = beard;
  g.beginPath();
  g.moveTo(70, 175);
  g.quadraticCurveTo(60, 220, 128, 235);
  g.quadraticCurveTo(196, 220, 186, 175);
  g.quadraticCurveTo(128, 195, 70, 175);
  g.fill();

  // Mustache
  g.fillStyle = "#3b2a1f";
  g.beginPath();
  g.ellipse(128, 178, 28, 10, 0, 0, Math.PI * 2);
  g.fill();

  // Soft smile
  g.strokeStyle = "#5a3020";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(128, 190, 16, 0.15, Math.PI - 0.15);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCeleBannerTexture(messi: boolean) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(8, 20, 16, 0.82)";
  g.beginPath();
  g.roundRect(8, 8, 496, 144, 16);
  g.fill();
  g.strokeStyle = "#e8b84a";
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = "#e8b84a";
  g.font = "bold 64px Anton, Impact, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("GOAL!", 256, 58);
  g.fillStyle = "#f4f7f2";
  g.font = "600 28px Sora, sans-serif";
  g.fillText(messi ? "MESSI · PARA EL CIELO ↑" : "CPU SCORES", 256, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
