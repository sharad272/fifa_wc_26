export function mountShell(root: HTMLElement) {
  root.innerHTML = `
  <div class="shell">
    <header class="brand-bar">
      <p class="eyebrow">FIFA World Cup 2026</p>
      <h1>SPOT KICK 26</h1>
    </header>

    <div class="stage">
      <canvas id="pitch" aria-label="Penalty shootout pitch"></canvas>

      <div class="hud">
        <div class="scoreboard" id="scoreboard" hidden>
          <div class="side">
            <span>Messi</span>
            <strong id="you-score">0</strong>
          </div>
          <div class="divider"></div>
          <div class="side">
            <span>Keeper</span>
            <strong id="cpu-score">0</strong>
          </div>
        </div>

        <div class="round-tag" id="round-tag" hidden></div>
        <div class="dots" id="dots" hidden></div>
        <p class="hint" id="hint"></p>

        <div class="power-wrap" id="power-wrap">
          <div class="power-label">
            <span id="shot-type">Shot</span>
            <span id="power-pct">0%</span>
          </div>
          <div class="power-track">
            <div class="power-fill" id="power-fill"></div>
          </div>
          <div class="power-zones">
            <span>Place</span>
            <span>Sweet</span>
            <span>Blast</span>
          </div>
        </div>
      </div>

      <div class="flash" id="flash"><span></span></div>

      <div class="overlay" id="overlay">
        <div class="panel">
          <p class="sub" id="overlay-sub">USA · Canada · Mexico</p>
          <h2 id="overlay-title">Messi from the spot</h2>
          <p id="overlay-body">
            Step up as Messi against the CPU keeper — aim, hold for power,
            release to shoot. Five kicks: beat the keeper on at least four to
            win the shootout.
          </p>
          <div class="actions">
            <button class="cta" id="start-btn" type="button">Start Shootout</button>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
}

export function getShellEls() {
  const canvas = document.querySelector<HTMLCanvasElement>("#pitch");
  const overlay = document.querySelector<HTMLDivElement>("#overlay");
  const overlaySub = document.querySelector<HTMLParagraphElement>("#overlay-sub");
  const overlayTitle = document.querySelector<HTMLHeadingElement>("#overlay-title");
  const overlayBody = document.querySelector<HTMLParagraphElement>("#overlay-body");
  const startBtn = document.querySelector<HTMLButtonElement>("#start-btn");
  const youScoreEl = document.querySelector<HTMLElement>("#you-score");
  const cpuScoreEl = document.querySelector<HTMLElement>("#cpu-score");
  const roundTag = document.querySelector<HTMLElement>("#round-tag");
  const hintEl = document.querySelector<HTMLElement>("#hint");
  const powerWrap = document.querySelector<HTMLElement>("#power-wrap");
  const powerFill = document.querySelector<HTMLElement>("#power-fill");
  const powerPct = document.querySelector<HTMLElement>("#power-pct");
  const shotType = document.querySelector<HTMLElement>("#shot-type");
  const scoreboard = document.querySelector<HTMLElement>("#scoreboard");
  const dots = document.querySelector<HTMLElement>("#dots");
  const flash = document.querySelector<HTMLElement>("#flash");

  if (
    !canvas ||
    !overlay ||
    !overlaySub ||
    !overlayTitle ||
    !overlayBody ||
    !startBtn ||
    !youScoreEl ||
    !cpuScoreEl ||
    !roundTag ||
    !hintEl ||
    !powerWrap ||
    !powerFill ||
    !powerPct ||
    !shotType ||
    !scoreboard ||
    !dots ||
    !flash
  ) {
    throw new Error("Shell elements missing");
  }

  const flashSpan = flash.querySelector("span");
  if (!flashSpan) throw new Error("Flash span missing");

  return {
    canvas,
    overlay,
    overlaySub,
    overlayTitle,
    overlayBody,
    startBtn,
    youScoreEl,
    cpuScoreEl,
    roundTag,
    hintEl,
    powerWrap,
    powerFill,
    powerPct,
    shotType,
    scoreboard,
    dots,
    flash,
    flashSpan,
  };
}
