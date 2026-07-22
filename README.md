# 🪳 Roach to Jantar Mantar

> One life. No weapons. Just vibes.

A satirical top-down arcade **stealth game**. You are a tiny cockroach crossing
central Delhi to reach **Jantar Mantar** — the only safe gathering place in the
city (the *Immunity Zone*), where hundreds of other cockroaches are peacefully
dancing. The Delhi Police, regrettably, has other plans.

A loving satire. No roaches were harmed. Avoid the lathi.

---

## Play

```bash
npm run setup   # one-command setup (npm install)
npm run dev     # play at http://localhost:5173
```

```bash
npm run build   # typecheck + production build → dist/
npm run preview # serve the production build locally
npm run deploy  # build + publish dist/ to a gh-pages branch
```

The build is fully static (`base: './'`) — host `dist/` anywhere.
It is also an installable **PWA** with offline support.

## How to play

- **Goal:** reach Jantar Mantar alive. You have **one life**, no attacks, no weapons.
- **Desktop:** WASD / arrow keys. `P` pause · `M` mute · `R` restart.
- **Mobile:** touch anywhere and drag — a floating joystick appears.
- A typical successful run takes **5–10 minutes** (including the inevitable retries).

### The city

A condensed, hand-stylized recreation of central Delhi, inspired by the real
road graph: India Gate (start) → Rajpath → Janpath → Connaught Place →
Sansad Marg → **Jantar Mantar**. Kasturba Gandhi Marg is your detour when
Janpath gets barricaded. It always gets barricaded.

### Threats

| Threat | Behaviour |
| --- | --- |
| 👮 Police | Patrol → spot ("❗") → investigate → intercept. They give up — they don't chase forever. |
| 🏏 Lathi charge | Telegraphed wind-up, then a short dash. Sidestep it. |
| 💨 Tear gas | Thrown while chasing. Edge slows + blurs you; the core ends the run. |
| 💦 Water cannon | Sweeping stream that shoves you around. An umbrella blocks one hit. |
| 🚌 Detention bus | Prowls Janpath. Touch it and you get vacuumed inside. Game over. |
| 🔦 Searchlights | Rotating beams that alert nearby police. |
| 🚗 Traffic | Delhi traffic. Enough said. |
| 🚧 Barricades | Physical roadblocks — find another way. |

### Power-ups

- ☕ **Coffee drop** — temporary speed boost
- 🍃 **Leaf** — 5 s of camouflage (police and searchlights can't see you)
- 🍞 **Bread crumb** — distracts nearby police
- ☂️ **Umbrella** — blocks one water-cannon hit

### Dynamic difficulty

The closer you get to Jantar Mantar, the faster the patrols, the wider their
vision cones, and reinforcements spawn at progress thresholds. The last 200 m
are a proper chakravyuh.

## Architecture

```
src/
  main.ts               entry: Phaser boot, resilient startup, PWA registration
  config.ts             every tuning knob in one place
  assets/
    TextureFactory.ts   THE ART PIPELINE — all sprites drawn to canvas at boot
                        (wobbly hand-drawn strokes, deterministic, zero image files)
  maps/
    DelhiMap.ts         condensed central-Delhi map data: roads, buildings,
                        patrols, traffic routes, hazards, powerups, easter eggs
  scenes/
    BootScene.ts        generates textures → Menu
    MenuScene.ts        title screen
    GameScene.ts        the run: world build, orchestration, win/lose
    UIScene.ts          screen-space HUD, minimap, buttons, joystick, pause
    GameOverScene.ts    random epitaphs + retry
    VictoryScene.ts     leaderboard + play again (party rages on behind it)
  ai/
    Police.ts           constable FSM (patrol/spot/investigate/intercept/
                        lathi windup/dash/stagger/distracted) + cheap LOS
  entities/
    Player.ts           the roach (Matter body, buffs, walk/idle animation)
    Traffic.ts          polyline-following vehicles + the detention bus
    Hazards.ts          tear gas clouds, water cannons, searchlights
    Powerup.ts          pickups
    Ambient.ts          pigeons, street dogs, food carts, speech bubbles
  audio/
    AudioManager.ts     100% synthesized WebAudio: squeaks, whistles, horns,
                        crowd ambience, victory fanfare, chiptune party loop
  particles/
    Effects.ts          confetti, fireworks, splashes, dust, floating emojis
  systems/
    Save.ts             localStorage leaderboard + mute preference
  ui/
    VirtualJoystick.ts  floating touch joystick
```

### Design decisions

- **Matter physics** for movement + solid collisions (player/police vs
  buildings, barricades, world walls). Game logic overlaps (catches, gas,
  streams, pickups) use cheap analytic math instead of physics bodies, so 20+
  vehicles and 100+ dancing roaches cost almost nothing. Measured frame cost:
  ~1 ms on a laptop — comfortable 60 FPS headroom for mobile.
- **Procedural asset pipeline**: every sprite is drawn once at boot onto
  canvas textures with deliberately imperfect strokes (Untitled-Goose-Game /
  old-Flash energy). No binary assets in the repo, nothing to export, the whole
  game ships as one small JS bundle (~360 KB gzipped).
- **Synthesized audio**: no audio files either. The AudioManager sketches
  every sound with oscillators and filtered noise.
- **Resilient boot** (`main.ts`): waits for a real layout size before creating
  the game and kicks the texture-ready chain if a throttled/background tab
  stalls it.

## Tuning

Everything lives in [src/config.ts](src/config.ts) — player speed, police
vision/speeds/cooldowns, gas radius, cannon push, difficulty curve, and the
game-over one-liners. The map (roads, patrols, hazard placement) lives in
[src/maps/DelhiMap.ts](src/maps/DelhiMap.ts) with an ASCII overview at the top.

## Tech

Phaser 3 (WebGL via Pixi-style renderer, Matter physics) · TypeScript · Vite ·
PWA (manifest + service worker) · localStorage persistence · zero runtime
dependencies beyond Phaser.
