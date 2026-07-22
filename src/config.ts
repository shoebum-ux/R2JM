/** Central tuning knobs for the whole game. Tweak here, not in scene code. */

export const WORLD = { w: 4200, h: 5800 };

export const PLAYER = {
  radius: 10,
  speed: 130,          // px/s base walk speed
  coffeeSpeedMult: 1.6,
  coffeeMs: 8000,
  leafMs: 5000,        // camouflage duration
  crumbMs: 6000,       // how long a bread crumb distracts police
  crumbRadius: 420     // police within this radius get distracted
};

export const POLICE = {
  speedPatrol: 62,
  speedInvestigate: 95,
  speedChase: 150,
  viewDist: 300,
  coneHalfAngle: 0.62,   // radians (~35deg each side)
  spotMs: 450,           // time from "!" to full chase
  chaseMs: 6500,         // give up chase after this long without touching you
  loseDist: 620,         // give up chase beyond this distance
  catchDist: 17,
  lathiRange: 115,
  lathiWindupMs: 620,
  lathiDashMs: 380,
  lathiSpeed: 340,
  lathiCooldownMs: 3200,
  gasCooldownMs: 9000,
  gasThrowMin: 160,
  gasThrowMax: 430,
  losCheckMs: 150        // how often to raycast line-of-sight
};

export const GAS = {
  radius: 110,
  coreFrac: 0.52,  // inside this fraction of radius = run over
  slowMult: 0.45,
  lifeMs: 6500,
  growMs: 900
};

export const CANNON = {
  length: 330,
  hitDist: 26,      // distance from stream line that counts as a hit
  push: 12,         // impulse-ish velocity added per frame while in stream
  sweepSpeed: 0.55, // rad/s
  sweepArc: 0.95    // +- radians around base angle
};

export const BUS = {
  speed: 105,
  catchW: 40,
  catchL: 78
};

export const LIGHT = {
  length: 380,
  halfAngle: 0.33,
  rotSpeed: 0.5 // rad/s
};

export const DIFFICULTY = {
  // multipliers scale linearly with progress (0 at start, 1 at Jantar Mantar)
  policeSpeedMax: 1.45,
  viewDistMax: 1.35,
  extraPatrolThresholds: [0.55, 0.75, 0.9] // spawn reinforcements at these progress marks
};

/** Collision categories for Matter. */
export const CAT = {
  WORLD: 0x0001,
  PLAYER: 0x0002,
  POLICE: 0x0004
};

export const FONT = '"Chalkboard SE", "Comic Sans MS", "Segoe Print", cursive';

export const GAME_OVER_LINES = [
  'You were detained.',
  'Wrong turn.',
  'Almost there.',
  'Back to the drain.',
  'Democracy is hard for roaches.',
  "Should've taken the Metro.",
  'Nice try, comrade roach.',
  'The city remembers you. Briefly.',
  'Six legs were not enough.',
  'Your antennae twitched their last twitch.'
];

export const SAVE_KEYS = {
  board: 'r2jm_board',
  muted: 'r2jm_muted'
};
