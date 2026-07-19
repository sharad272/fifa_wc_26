import "./style.css";
import { PenaltyGame } from "./game/index.ts";
import { createHud } from "./ui/hud.ts";
import { getShellEls, mountShell } from "./ui/shell.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

mountShell(app);
const els = getShellEls();
const hud = createHud(els);

const game = new PenaltyGame(els.canvas, () => hud.sync(game.getState()));

els.startBtn.addEventListener("click", () => {
  hud.beginMatch();
  if (!hud.started) {
    game.start();
    hud.started = true;
  } else {
    game.restart();
  }
  hud.sync(game.getState());
});
