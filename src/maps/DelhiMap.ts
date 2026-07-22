/**
 * DelhiMap — a condensed, stylized recreation of central Delhi.
 *
 * Layout (inspired by the real road graph, heavily simplified):
 *
 *        ┌──── Connaught Place (ring) ────┐
 *        │  Sansad Marg ↘      ↙ KG Marg  │
 *   Jantar Mantar ★       Janpath │ Kasturba
 *        Tolstoy Marg ────────────┼──────
 *        Rajesh Pilot Marg ───────┼──────
 *                     [choke]     │
 *        cross roads ─────────────┼──────
 *   Parliament ══════ Rajpath ════╪══════ India Gate 🐜 (start)
 *
 * The player starts on the India Gate lawns (bottom-right) and must travel
 * west along Rajpath, north up Janpath (or detour via Kasturba Gandhi Marg),
 * skirt Connaught Place and slip down Sansad Marg into Jantar Mantar.
 */

import { WORLD } from '../config';

export interface RoadSeg { x1: number; y1: number; x2: number; y2: number; w: number; }
export interface Rect { x: number; y: number; w: number; h: number; }
export interface Pt { x: number; y: number; }
export type PowerupType = 'coffee' | 'leaf' | 'crumb' | 'umbrella';

export interface PatrolDef { pts: Pt[]; loop?: boolean; }
export interface TrafficDef { pts: Pt[]; type: string; count: number; speed: number; loop?: boolean; }

const R = { main: 180, med: 140, side: 110 };

/** CP ring geometry. */
export const RING = { cx: 2700, cy: 750, r: 500, w: 130 };

function ringPt(angle: number, r = RING.r): Pt {
  return { x: RING.cx + Math.cos(angle) * r, y: RING.cy + Math.sin(angle) * r };
}

function circlePts(cx: number, cy: number, r: number, n: number, startA = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = startA + (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

export const ROADS: RoadSeg[] = [
  // Rajpath / Kartavya Path (Parliament → India Gate)
  { x1: 450, y1: 5000, x2: 3980, y2: 5000, w: R.main },
  // Janpath (Rajpath → CP)
  { x1: 2700, y1: 5000, x2: 2700, y2: 1240, w: R.med },
  // Rafi Marg
  { x1: 1500, y1: 5000, x2: 1500, y2: 3400, w: R.side },
  // Maulana Azad-ish cross road
  { x1: 1500, y1: 4200, x2: 2700, y2: 4200, w: R.side },
  // cross road connecting Rafi → Kasturba (the big detour road)
  { x1: 1500, y1: 3400, x2: 3500, y2: 3400, w: R.side },
  // Rajesh Pilot / Ferozeshah-ish road
  { x1: 1100, y1: 2600, x2: 3500, y2: 2600, w: R.side },
  // Tolstoy Marg
  { x1: 1800, y1: 1800, x2: 3500, y2: 1800, w: R.side },
  // Kasturba Gandhi Marg (east alternative route)
  { x1: 3500, y1: 1800, x2: 3500, y2: 5000, w: R.side + 10 },
  // KG Marg spoke into CP
  { x1: 3054, y1: 1104, x2: 3500, y2: 1800, w: R.side },
  // Sansad Marg (CP → Jantar Mantar → connector south)
  { x1: 2346, y1: 1104, x2: 1800, y2: 2100, w: R.side + 10 },
  { x1: 1800, y1: 2100, x2: 1800, y2: 2600, w: R.side },
  // CP east + west spokes
  { x1: 3200, y1: 750, x2: 4000, y2: 750, w: R.side },
  { x1: 2200, y1: 750, x2: 1400, y2: 750, w: R.side }
];

export const START: Pt = { x: 3860, y: 5330 };
export const GOAL = { x: 2150, y: 1560, r: 150 };

/** Buildings (top-left based rects). Solid — the roach cannot pass. */
export const BUILDINGS: Rect[] = [
  // Secretariat blocks near Parliament
  { x: 350, y: 4450, w: 260, h: 180 },
  { x: 350, y: 5150, w: 260, h: 180 },
  { x: 1180, y: 4480, w: 220, h: 160 },
  { x: 1180, y: 5150, w: 220, h: 160 },
  { x: 1650, y: 4480, w: 200, h: 150 },
  { x: 1650, y: 5150, w: 220, h: 160 },
  { x: 1980, y: 5170, w: 240, h: 180 }, // National Museum-ish
  { x: 3040, y: 5160, w: 240, h: 180 },
  // between cross roads, west of Janpath
  { x: 1750, y: 4330, w: 240, h: 200 },
  { x: 2200, y: 4400, w: 260, h: 220 },
  { x: 2300, y: 3550, w: 260, h: 240 },
  { x: 2300, y: 3900, w: 260, h: 200 },
  { x: 1900, y: 3600, w: 260, h: 280 },
  // east of Janpath
  { x: 2850, y: 4500, w: 260, h: 220 },
  { x: 2850, y: 4050, w: 240, h: 260 },
  { x: 3200, y: 4300, w: 200, h: 300 },
  { x: 2850, y: 3550, w: 240, h: 240 },
  { x: 3150, y: 3800, w: 240, h: 200 },
  // the Janpath choke corridor (tight buildings + barricade = forced detour)
  { x: 2470, y: 2720, w: 160, h: 230 },
  { x: 2470, y: 3010, w: 160, h: 320 },
  { x: 2770, y: 2720, w: 200, h: 230 },
  { x: 2770, y: 3010, w: 200, h: 320 },
  // between Rajesh Pilot and Tolstoy
  { x: 2450, y: 1950, w: 240, h: 300 },
  { x: 2900, y: 2000, w: 260, h: 300 },
  { x: 3200, y: 1950, w: 200, h: 250 },
  { x: 1950, y: 2150, w: 180, h: 240 },
  // between Tolstoy and CP ring
  { x: 2900, y: 1400, w: 240, h: 300 },
  { x: 3250, y: 1420, w: 220, h: 280 },
  { x: 2300, y: 1400, w: 180, h: 280 },
  // CP inner blocks (shops between ring and central park)
  { x: 2600, y: 350, w: 200, h: 120 },
  { x: 2980, y: 650, w: 120, h: 200 },
  { x: 2600, y: 1030, w: 200, h: 120 },
  { x: 2300, y: 650, w: 120, h: 200 },
  // fillers — outer city texture
  { x: 2450, y: 40, w: 400, h: 150 },
  { x: 1500, y: 300, w: 300, h: 250 },
  { x: 3400, y: 300, w: 300, h: 250 },
  { x: 3650, y: 2000, w: 300, h: 300 },
  { x: 3650, y: 2900, w: 300, h: 350 },
  { x: 3650, y: 3800, w: 300, h: 300 },
  { x: 3650, y: 4450, w: 300, h: 300 },
  { x: 700, y: 3600, w: 350, h: 300 },
  { x: 700, y: 2900, w: 350, h: 300 },
  { x: 900, y: 2000, w: 300, h: 300 },
  { x: 600, y: 1400, w: 350, h: 300 },
  { x: 900, y: 4350, w: 300, h: 250 }
];

/** Decorative lawn patches (no collision). */
export const LAWNS: Rect[] = [
  { x: 450, y: 4740, w: 3450, h: 170 },   // Rajpath north lawns
  { x: 450, y: 5090, w: 2500, h: 170 },   // Rajpath south lawns
  { x: 3350, y: 5090, w: 700, h: 500 },   // India Gate lawns (start area)
  { x: 1850, y: 1350, w: 420, h: 480 },   // Jantar Mantar gardens
  { x: 1100, y: 900, w: 500, h: 350 }
];

/** Decorative water strips (Rajpath canals). No collision. */
export const WATER: Rect[] = [
  { x: 700, y: 4700, w: 2700, h: 34 },
  { x: 700, y: 5266, w: 1900, h: 34 }
];

export const MONUMENTS: { key: string; x: number; y: number; scale: number }[] = [
  { key: 'india_gate', x: 3660, y: 5210, scale: 1.15 },
  { key: 'parliament', x: 650, y: 4620, scale: 1.1 },
  { key: 'jantar', x: GOAL.x, y: GOAL.y, scale: 1.35 },
  { key: 'cp_park', x: RING.cx, y: RING.cy, scale: 2.2 }
];

/** Barricades: {x, y, angle} — angle in radians (long axis of the barricade). */
export const BARRICADES: { x: number; y: number; angle: number }[] = [
  // the mid-Janpath choke — fully blocks the corridor
  { x: 2656, y: 3050, angle: 0 },
  { x: 2748, y: 3050, angle: 0 },
  // south CP entrance — partial, squeeze past on the east
  { x: 2652, y: 1360, angle: 0 },
  // KG Marg spoke pinch
  { x: 3290, y: 1470, angle: 1.0 },
  // near-goal chicane on Sansad Marg
  { x: 2120, y: 1310, angle: 1.07 },
  { x: 1965, y: 1935, angle: 1.07 }
];

/** Water cannon units: {x, y, angle} — base aim direction in radians. */
export const CANNONS: { x: number; y: number; angle: number }[] = [
  { x: 2790, y: 1450, angle: Math.PI / 2 },  // guards CP south entrance, sweeps down Janpath
  { x: 2280, y: 1720, angle: 2.35 }          // guards Jantar Mantar approach
];

/** Rotating searchlight posts. */
export const LIGHTS: Pt[] = [
  { x: 2620, y: 1300 },
  { x: 3054, y: 1180 },
  { x: 1990, y: 2030 }
];

/** Police patrol routes (ping-pong between points unless loop). */
export const PATROLS: PatrolDef[] = [
  { pts: [{ x: 1200, y: 5000 }, { x: 2450, y: 5000 }] },
  { pts: [{ x: 2950, y: 5000 }, { x: 3800, y: 5000 }] },
  { pts: [{ x: 3550, y: 4930 }, { x: 3800, y: 4930 }, { x: 3800, y: 5070 }, { x: 3550, y: 5070 }], loop: true },
  { pts: [{ x: 2700, y: 4820 }, { x: 2700, y: 4300 }] },
  { pts: [{ x: 2700, y: 4080 }, { x: 2700, y: 3500 }] },
  { pts: [{ x: 1700, y: 3400 }, { x: 3300, y: 3400 }] },
  { pts: [{ x: 1300, y: 2600 }, { x: 2600, y: 2600 }] },
  { pts: [{ x: 2800, y: 2600 }, { x: 3400, y: 2600 }] },
  { pts: [{ x: 3500, y: 3200 }, { x: 3500, y: 2000 }] },
  { pts: [{ x: 2000, y: 1800 }, { x: 3300, y: 1800 }] },
  { pts: circlePts(RING.cx, RING.cy, RING.r, 10, 0), loop: true },
  { pts: circlePts(RING.cx, RING.cy, RING.r, 10, Math.PI), loop: true },
  { pts: [{ x: 2280, y: 1220 }, { x: 1870, y: 1980 }] },
  { pts: [{ x: 2040, y: 1420 }, { x: 1880, y: 1720 }] }
];

/** Where late-game reinforcements appear (dynamic difficulty). */
export const REINFORCEMENTS: PatrolDef[] = [
  { pts: [{ x: 2700, y: 2450 }, { x: 2700, y: 1900 }] },
  { pts: [{ x: 3500, y: 2500 }, { x: 3500, y: 1900 }] },
  { pts: [{ x: 2250, y: 1200 }, { x: 1950, y: 1800 }] }
];

/** Traffic routes. */
export const TRAFFIC: TrafficDef[] = [
  { pts: [{ x: 470, y: 5045 }, { x: 3960, y: 5045 }], type: 'car', count: 3, speed: 155 },
  { pts: [{ x: 3960, y: 4955 }, { x: 470, y: 4955 }], type: 'car', count: 3, speed: 150 },
  { pts: [{ x: 470, y: 4975 }, { x: 3960, y: 4975 }], type: 'bus_city', count: 1, speed: 120 },
  { pts: [{ x: 2733, y: 4990 }, { x: 2733, y: 1260 }], type: 'auto', count: 3, speed: 130 },
  { pts: [{ x: 2667, y: 1260 }, { x: 2667, y: 4990 }], type: 'auto', count: 2, speed: 135 },
  { pts: [{ x: 2668, y: 1260 }, { x: 2668, y: 4990 }], type: 'bike', count: 1, speed: 175 },
  { pts: [{ x: 3532, y: 1820 }, { x: 3532, y: 4990 }], type: 'car', count: 2, speed: 145 },
  { pts: [{ x: 3468, y: 4990 }, { x: 3468, y: 1820 }], type: 'bike', count: 2, speed: 170 },
  { pts: [{ x: 1120, y: 2632 }, { x: 3480, y: 2632 }], type: 'bike', count: 2, speed: 160 },
  { pts: [{ x: 3480, y: 2568 }, { x: 1120, y: 2568 }], type: 'auto', count: 2, speed: 130 },
  { pts: circlePts(RING.cx, RING.cy, RING.r, 16, 0.3), type: 'auto', count: 3, speed: 120, loop: true }
];

/** The detention bus prowls Janpath. */
export const BUS_ROUTE: Pt[] = [{ x: 2700, y: 1500 }, { x: 2700, y: 4750 }];

export const POWERUPS: { x: number; y: number; type: PowerupType }[] = [
  { x: 3400, y: 5060, type: 'coffee' },
  { x: 2760, y: 3460, type: 'coffee' },
  { x: 3435, y: 2530, type: 'coffee' },
  { x: 2640, y: 4260, type: 'leaf' },
  { x: 2755, y: 2655, type: 'leaf' },
  { x: 3560, y: 1870, type: 'leaf' },
  { x: 2650, y: 3300, type: 'crumb' },
  { x: 2310, y: 2560, type: 'crumb' },
  { x: 3060, y: 1755, type: 'crumb' },
  { x: 2735, y: 1660, type: 'umbrella' },
  { x: 2350, y: 2250, type: 'umbrella' }
];

export const CARTS: Pt[] = [
  { x: 3100, y: 5100 },
  { x: 2610, y: 4480 },
  { x: 3570, y: 2350 },
  { x: 2480, y: 1330 }
];

export const SIGNS: { x: number; y: number; text: string }[] = [
  { x: 3850, y: 4880, text: 'DELHI POLICE: NO ROACHES BEYOND THIS POINT' },
  { x: 2790, y: 4160, text: 'METRO COMING SOON (SINCE 2019)' },
  { x: 2620, y: 2690, text: 'SHORTCUT? THERE ARE NO SHORTCUTS' },
  { x: 3555, y: 3330, text: 'HONK IF YOU ARE A ROACH' },
  { x: 2280, y: 1970, text: 'JANTAR MANTAR: PROTEST RESPONSIBLY' },
  { x: 1620, y: 4880, text: 'VIP MOVEMENT: PLEASE EVAPORATE' }
];

export const PIGEONS: Pt[] = [
  { x: 3520, y: 5200 }, { x: 3590, y: 5290 }, { x: 3760, y: 5350 },
  { x: 3820, y: 5180 }, { x: 2690, y: 700 }, { x: 2760, y: 810 },
  { x: 2640, y: 830 }, { x: 1300, y: 1000 }
];

export const DOGS: Pt[] = [
  { x: 3160, y: 5150 }, { x: 2560, y: 4430 }, { x: 3620, y: 2420 }, { x: 1950, y: 2680 }
];

/** Trees: Rajpath avenues + scattered greens (deterministic). */
export function treePositions(): { x: number; y: number; v: number }[] {
  const out: { x: number; y: number; v: number }[] = [];
  for (let x = 600; x <= 3900; x += 260) {
    if (Math.abs(x - 2700) < 180) continue; // skip Janpath crossing
    out.push({ x, y: 4855, v: x % 2 === 0 ? 0 : 1 });
    out.push({ x: x + 60, y: 5150, v: (x / 260) % 2 === 0 ? 1 : 0 });
  }
  // India Gate + Jantar gardens + CP park
  const extra: Pt[] = [
    { x: 3450, y: 5350 }, { x: 3950, y: 5450 }, { x: 3550, y: 5500 },
    { x: 1900, y: 1420 }, { x: 2270, y: 1750 }, { x: 1930, y: 1800 },
    { x: 2550, y: 620 }, { x: 2860, y: 900 }, { x: 1250, y: 1050 },
    { x: 1350, y: 3200 }, { x: 1200, y: 2500 }, { x: 850, y: 2100 },
    { x: 2100, y: 3450 }, { x: 3080, y: 3050 }, { x: 2200, y: 4680 },
    { x: 1150, y: 4200 }, { x: 750, y: 5450 }, { x: 2400, y: 5400 }
  ];
  extra.forEach((p, i) => out.push({ x: p.x, y: p.y, v: i % 2 }));
  return out;
}

/** Straight-line distance from start to goal — used for progress/difficulty. */
export function totalDist(): number {
  return Math.hypot(START.x - GOAL.x, START.y - GOAL.y);
}

export { WORLD };
