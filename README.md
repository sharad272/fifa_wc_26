# Spot Kick 26

Interactive World Cup 2026 penalty shootout — you are Messi from the spot against a CPU keeper.

## Architecture

Modular (service-style) layout — no monolith:

| Path | Responsibility |
|------|----------------|
| `src/core/` | Types, constants, math |
| `src/services/` | Shot logic, match rules, particles |
| `src/world3d/` | **Three.js / WebGL 3D** pitch, rigged GLTF players, lights |
| `src/game/` | Thin engine / orchestrator |
| `src/ui/` | Shell markup + HUD |

## Credits

`public/models/player.glb` — "Man" animated character by
[Quaternius](https://quaternius.com) (Public Domain / CC0), recolored at
runtime into the Argentina kit and the keeper kit.

## Play locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Netlify

1. Push this repo to GitHub.
2. In [Netlify](https://app.netlify.com), **Add new site → Import an existing project**.
3. Build settings are in `netlify.toml` (`npm run build` → `dist`).
4. Or drag-and-drop `dist` onto [Netlify Drop](https://app.netlify.com/drop).

## How to play

1. **Messi's penalty** — aim + power pick the shot like FIFA/PES:
   - **Low aim** → grounded / driven along the turf  
   - **High aim** → aerial lofted finish  
   - **Corners + mid power** → placed curl to the side netting  
   - **Max power** → blast (faster, risk of going over)
2. The **CPU keeper** reads the shot zone like a real keeper — disguise your kicks.
3. Five kicks — score at least four to win the shootout.
