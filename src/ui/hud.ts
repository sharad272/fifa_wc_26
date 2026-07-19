import type { HudState, KickRecord } from "../core/types.ts";
import type { getShellEls } from "./shell.ts";

type ShellEls = ReturnType<typeof getShellEls>;

export function createHud(els: ShellEls) {
  let lastFlashKey = "";
  let started = false;

  function renderDots(youKicks: KickRecord[], cpuKicks: KickRecord[]) {
    const row = (label: string, kicks: KickRecord[]) => {
      const cells = Array.from({ length: 5 }, (_, i) => {
        const k = kicks[i];
        const cls = k ? `dot ${k.result === "goal" ? "goal" : "miss"}` : "dot";
        return `<i class="${cls}"></i>`;
      }).join("");
      return `<div class="dot-row"><small>${label}</small>${cells}</div>`;
    };
    els.dots.innerHTML = row("Messi", youKicks) + row("Keeper", cpuKicks);
  }

  function sync(state: HudState) {
    els.youScoreEl.textContent = String(state.youScore);
    els.cpuScoreEl.textContent = String(state.cpuScore);

    els.roundTag.textContent = `Kick ${Math.min(state.round, 5)} / 5 · Messi vs CPU keeper`;
    els.hintEl.textContent = state.hint;

    const showPower = state.phase === "aim_shoot" || state.phase === "charge";
    els.powerWrap.classList.toggle("visible", showPower);
    const pct = Math.round(state.power * 100);
    els.powerFill.style.width = `${pct}%`;
    els.powerPct.textContent = `${pct}%`;
    const style = state.shotLabel.split("·")[0]?.trim() || "Shot";
    els.shotType.textContent = style;
    els.powerFill.dataset.zone =
      pct < 40 ? "place" : pct < 78 ? "sweet" : "blast";

    renderDots(state.youKicks, state.cpuKicks);

    if (state.phase === "result" && state.lastResult) {
      const key = `${state.youKicks.length}-${state.cpuKicks.length}-${state.lastResult}-${state.shooterIsYou}`;
      if (key !== lastFlashKey) {
        lastFlashKey = key;
        const isGoal = state.lastResult === "goal";
        els.flash.className = `flash show ${
          isGoal ? "goal" : state.lastResult === "save" ? "save" : "miss"
        }`;
        els.flashSpan.textContent = isGoal
          ? state.shooterIsYou
            ? "GOAL! ↑"
            : "GOAL!"
          : state.lastResult === "save"
            ? "SAVE"
            : "MISS";
        window.setTimeout(
          () => {
            els.flash.className = "flash";
          },
          isGoal ? 2200 : 900,
        );
      }
    }

    if (state.phase === "match_over") {
      const scored = state.youScore;
      els.overlay.classList.remove("hidden");
      els.overlaySub.textContent = `${scored} / 5 scored`;
      els.overlayTitle.textContent =
        scored >= 4 ? "Messi magic!" : scored >= 3 ? "Solid shootout" : "The keeper wins";
      els.overlayBody.textContent =
        scored >= 4
          ? "Clinical from the spot — the crowd chants his name. Run it back?"
          : scored >= 3
            ? "Good return, but there were saves in there. One more round?"
            : "The CPU keeper had your number. Re-take the shootout.";
      els.startBtn.textContent = "Play Again";
      started = false;
    }
  }

  function beginMatch() {
    els.overlay.classList.add("hidden");
    els.scoreboard.hidden = false;
    els.roundTag.hidden = false;
    els.dots.hidden = false;
    lastFlashKey = "";
  }

  return {
    sync,
    beginMatch,
    get started() {
      return started;
    },
    set started(v: boolean) {
      started = v;
    },
  };
}
