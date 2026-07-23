/**
 * TextureFactory — the entire art pipeline.
 *
 * Every sprite in the game is drawn at boot onto canvas textures with
 * deliberately wobbly, hand-drawn strokes (think old Flash games / Untitled
 * Goose Game). No external image files: the pipeline is fully automatic,
 * deterministic and self-contained.
 */

type Ctx = CanvasRenderingContext2D;

// Deterministic pseudo-random so the art looks identical every boot.
let seed = 1337;
function rnd(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
function jitter(amount: number): number {
  return (rnd() - 0.5) * amount;
}

/** Create a canvas texture and hand the 2d context to a draw callback. */
function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const c = scene.textures.createCanvas(key, w, h);
  if (!c) return;
  const ctx = c.getContext();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  c.refresh();
}

/** A hand-drawn wobbly line. */
function wline(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, wob = 1.2): void {
  const segs = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 8));
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    ctx.lineTo(x1 + (x2 - x1) * t + jitter(wob), y1 + (y2 - y1) * t + jitter(wob));
  }
  ctx.stroke();
}

/** Wobbly ellipse, filled + outlined. */
function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string, stroke = '#2e1c10', lw = 1.6): void {
  ctx.beginPath();
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * (rx + jitter(1.4));
    const y = cy + Math.sin(a) * (ry + jitter(1.4));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Wobbly rounded rect. */
function wrect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke = '#2e1c10', lw = 1.6): void {
  ctx.beginPath();
  ctx.moveTo(x + jitter(1), y + jitter(1));
  ctx.lineTo(x + w + jitter(1), y + jitter(1));
  ctx.lineTo(x + w + jitter(1), y + h + jitter(1));
  ctx.lineTo(x + jitter(1), y + h + jitter(1));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- cockroach

/** Cockroach walking frames, drawn facing UP. legPhase -1 / 0 / 1. */
function roachFrame(scene: Phaser.Scene, key: string, legPhase: number): void {
  tex(scene, key, 36, 40, (ctx) => {
    const cx = 18, cy = 22;
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 2;
    // 3 legs each side; middle pair counter-phases with front/back
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const ay = cy - 6 + i * 6;
        const phase = (i === 1 ? -legPhase : legPhase) * 3;
        wline(ctx, cx + side * 5, ay, cx + side * 14, ay + phase - 2, 0.8);
      }
    }
    // abdomen
    blob(ctx, cx, cy + 2, 7, 11, '#7a4c28');
    ctx.strokeStyle = '#5a3419';
    ctx.lineWidth = 1.2;
    wline(ctx, cx, cy - 6, cx, cy + 11, 0.7); // wing split
    // head
    blob(ctx, cx, cy - 11, 4.5, 4.5, '#5a3419');
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 2, cy - 12, 1.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 2, cy - 12, 1.1, 0, 7); ctx.fill();
    // antennae wave with the walk cycle
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 1.4;
    const sway = legPhase * 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 14);
    ctx.quadraticCurveTo(cx - 8 + sway, cy - 22, cx - 12 + sway, cy - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 14);
    ctx.quadraticCurveTo(cx + 8 + sway, cy - 22, cx + 12 + sway, cy - 20);
    ctx.stroke();
  });
}

/**
 * A big, crisp, cute hero cockroach for the title screen — drawn at high
 * resolution with smooth curves so it never looks like an upscaled sprite.
 * Faces up (antennae toward the top).
 */
function buildMenuRoach(scene: Phaser.Scene): void {
  tex(scene, 'roach_hero', 240, 270, (ctx) => {
    const cx = 120, cy = 150;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- legs (under the body) ---
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 8;
    const legDefs = [
      { ay: -48, kx: 36, ky: -22, fx: 64, fy: -44 }, // front
      { ay: -4, kx: 42, ky: -4, fx: 70, fy: 0 },     // middle
      { ay: 42, kx: 38, ky: 22, fx: 64, fy: 50 }     // back
    ];
    for (let s = -1; s <= 1; s += 2) {
      for (const L of legDefs) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 22, cy + L.ay);
        ctx.quadraticCurveTo(cx + s * L.kx, cy + L.ky, cx + s * L.fx, cy + L.fy);
        ctx.stroke();
      }
    }

    // --- antennae ---
    ctx.lineWidth = 8;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 8, cy - 92);
      ctx.quadraticCurveTo(cx + s * 44, cy - 158, cx + s * 70, cy - 138);
      ctx.stroke();
    }

    // --- abdomen ---
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 52, 76, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a4c28';
    ctx.fill();
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 6;
    ctx.stroke();

    // pronotum (shield behind the head)
    ctx.beginPath();
    ctx.ellipse(cx, cy - 44, 36, 32, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6a4020';
    ctx.fill();
    ctx.stroke();

    // wing split + wing outlines + a couple of segment hints
    ctx.strokeStyle = '#5a3419';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx, cy + 88);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 26);
    ctx.quadraticCurveTo(cx - 48, cy + 22, cx - 22, cy + 82);
    ctx.moveTo(cx + 2, cy - 26);
    ctx.quadraticCurveTo(cx + 48, cy + 22, cx + 22, cy + 82);
    ctx.stroke();

    // soft highlight on the shell
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy - 2, 15, 28, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168,112,64,0.55)';
    ctx.fill();

    // --- head ---
    ctx.beginPath();
    ctx.ellipse(cx, cy - 78, 30, 27, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5a3419';
    ctx.fill();
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 6;
    ctx.stroke();

    // big cute eyes
    for (const ex of [-12, 12]) {
      ctx.beginPath();
      ctx.arc(cx + ex, cy - 82, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + ex + 1.5, cy - 80, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#2e1c10';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + ex - 1.5, cy - 84, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    // tiny smile
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 69, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  });
}

// ------------------------------------------------------------------ police

/** Top-down police constable. pose: walk0 | walk1 | windup | dash */
function copFrame(scene: Phaser.Scene, key: string, pose: string): void {
  tex(scene, key, 44, 44, (ctx) => {
    const cx = 22, cy = 24;
    // lathi (bamboo stick) — angle depends on pose. Drawn first (under body).
    ctx.strokeStyle = '#8a5a24';
    ctx.lineWidth = 3;
    let la = -0.5; // resting, pointing up-right
    if (pose === 'walk1') la = -0.35;
    if (pose === 'windup') la = 0.9;   // pulled back
    if (pose === 'dash') la = -1.57;   // thrust forward (up)
    const lx = cx + 9, ly = cy - 2;
    wline(ctx, lx, ly, lx + Math.cos(la) * 15, ly + Math.sin(la) * 15, 0.6);
    // shoulders (khaki uniform)
    blob(ctx, cx, cy, 10, 8, '#b5a06b');
    // shoulder pads
    ctx.fillStyle = '#8f7c4e';
    ctx.fillRect(cx - 10, cy - 3, 4, 6);
    ctx.fillRect(cx + 6, cy - 3, 4, 6);
    // walking feet peeking out
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 2.4;
    const step = pose === 'walk1' ? 3 : pose === 'walk0' ? -3 : 0;
    wline(ctx, cx - 4, cy + 8, cx - 4, cy + 12 + step, 0.5);
    wline(ctx, cx + 4, cy + 8, cx + 4, cy + 12 - step, 0.5);
    // cap (peaked cap seen from above)
    blob(ctx, cx, cy - 4, 6.5, 6.5, '#3d5734');
    ctx.fillStyle = '#c9b98a';
    ctx.beginPath(); ctx.arc(cx, cy - 4, 2.4, 0, 7); ctx.fill(); // cap badge
    // brim pointing up (facing direction)
    wrect(ctx, cx - 4, cy - 13, 8, 4, '#2f4228', '#2e1c10', 1.2);
  });
}

// ---------------------------------------------------------------- vehicles

function vehicle(scene: Phaser.Scene, key: string, w: number, h: number, body: string, roof: string, label?: string): void {
  tex(scene, key, w, h, (ctx) => {
    const m = 3;
    wrect(ctx, m, m, w - m * 2, h - m * 2, body);
    // windshield near the top (vehicles face up)
    ctx.fillStyle = '#b8d4da';
    ctx.fillRect(m + 3, m + 6, w - m * 2 - 6, 7);
    // roof block
    ctx.fillStyle = roof;
    ctx.fillRect(m + 4, m + 16, w - m * 2 - 8, h - m * 2 - 26);
    // headlights
    ctx.fillStyle = '#ffe9a3';
    ctx.fillRect(m + 2, m, 4, 3);
    ctx.fillRect(w - m - 6, m, 4, 3);
    if (label) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(10, w - 14)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  });
}

// ------------------------------------------------------------------- build

export function buildTextures(scene: Phaser.Scene): void {
  seed = 1337;

  // --- cockroach walk cycle ---
  roachFrame(scene, 'roach_0', -1);
  roachFrame(scene, 'roach_1', 0);
  roachFrame(scene, 'roach_2', 1);

  // --- big, crisp hero roach for the title screen ---
  buildMenuRoach(scene);

  // --- police ---
  copFrame(scene, 'cop_0', 'walk0');
  copFrame(scene, 'cop_1', 'walk1');
  copFrame(scene, 'cop_windup', 'windup');
  copFrame(scene, 'cop_dash', 'dash');

  // --- vehicles (drawn facing up) ---
  vehicle(scene, 'car_0', 34, 62, '#c05d4e', '#a34b3e');
  vehicle(scene, 'car_1', 34, 62, '#5a7ea3', '#48688a');
  vehicle(scene, 'car_2', 34, 62, '#c9c3b2', '#aba690');
  vehicle(scene, 'auto', 30, 50, '#e8c832', '#3f7e4e'); // yellow-green auto rickshaw
  vehicle(scene, 'bus_city', 46, 100, '#d0743c', '#b5602f', 'DTC');
  tex(scene, 'bike', 18, 46, (ctx) => {
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 3;
    wline(ctx, 9, 6, 9, 40, 0.6);
    blob(ctx, 9, 20, 5, 8, '#666f77'); // rider
    blob(ctx, 9, 14, 3.5, 3.5, '#333'); // helmet
  });

  // detention bus — the scary one
  tex(scene, 'bus_police', 52, 116, (ctx) => {
    wrect(ctx, 3, 3, 46, 110, '#5b7fae');
    ctx.fillStyle = '#b8d4da';
    ctx.fillRect(7, 8, 38, 9); // windshield
    ctx.fillStyle = '#3d5a83';
    ctx.fillRect(7, 22, 38, 80); // roof
    // wire mesh windows suggestion
    ctx.strokeStyle = '#8ba4c4';
    ctx.lineWidth = 1;
    for (let y = 28; y < 98; y += 8) wline(ctx, 8, y, 44, y, 0.4);
    ctx.save();
    ctx.translate(26, 60);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POLICE', 0, 0);
    ctx.restore();
    // red beacon
    ctx.fillStyle = '#e04338';
    ctx.beginPath(); ctx.arc(26, 12, 3, 0, 7); ctx.fill();
  });

  // water cannon truck (stationary unit)
  tex(scene, 'cannon', 48, 60, (ctx) => {
    wrect(ctx, 4, 10, 40, 46, '#6a7f95');
    ctx.fillStyle = '#51637a';
    ctx.fillRect(9, 20, 30, 30);
    blob(ctx, 24, 20, 9, 9, '#3f4f63'); // turret
    ctx.strokeStyle = '#2e3a4a';
    ctx.lineWidth = 5;
    wline(ctx, 24, 20, 24, 2, 0.5); // barrel points up
  });

  // --- props ---
  tex(scene, 'barricade', 96, 26, (ctx) => {
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 2.2;
    wline(ctx, 8, 24, 16, 4, 0.8);
    wline(ctx, 88, 24, 80, 4, 0.8);
    wrect(ctx, 4, 4, 88, 12, '#e8b93c');
    ctx.fillStyle = '#c23b30';
    for (let x = 8; x < 88; x += 16) {
      ctx.save();
      ctx.translate(x, 10);
      ctx.rotate(-0.35);
      ctx.fillRect(-3, -7, 7, 15);
      ctx.restore();
    }
    ctx.fillStyle = '#2e1c10';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DELHI POLICE', 48, 13);
  });

  tex(scene, 'tree_0', 56, 56, (ctx) => {
    blob(ctx, 28, 28, 21, 19, '#7ba05b', '#4a6636', 2);
    blob(ctx, 20, 22, 8, 7, '#8fb56c', '');
    blob(ctx, 34, 32, 7, 6, '#6b904e', '');
  });
  tex(scene, 'tree_1', 48, 48, (ctx) => {
    blob(ctx, 24, 24, 17, 16, '#8fae5f', '#5a7440', 2);
    blob(ctx, 28, 18, 6, 5, '#a3c273', '');
  });

  tex(scene, 'cart', 48, 44, (ctx) => {
    wrect(ctx, 6, 12, 36, 22, '#b97e4b');
    // umbrella on the cart
    blob(ctx, 24, 12, 20, 9, '#d95f4c', '#8a2a1e', 2);
    ctx.strokeStyle = '#8a2a1e';
    ctx.lineWidth = 1.4;
    wline(ctx, 24, 4, 24, 20, 0.5);
    // wheels
    ctx.fillStyle = '#2e1c10';
    ctx.beginPath(); ctx.arc(12, 38, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(36, 38, 4, 0, 7); ctx.fill();
    // snacks
    ctx.fillStyle = '#e8c832';
    ctx.beginPath(); ctx.arc(16, 20, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(26, 22, 3, 0, 7); ctx.fill();
  });

  tex(scene, 'pigeon', 16, 16, (ctx) => {
    blob(ctx, 8, 9, 5, 4, '#9aa0ab', '#5a5f68', 1.2);
    blob(ctx, 8, 4.5, 2.5, 2.5, '#7d838d', '#5a5f68', 1);
    ctx.fillStyle = '#e8a13c';
    ctx.fillRect(7, 1, 2, 2);
  });

  tex(scene, 'dog', 26, 40, (ctx) => {
    blob(ctx, 13, 22, 7, 12, '#c9a86f', '#8a713f', 1.6);
    blob(ctx, 13, 8, 5, 5, '#b8965c', '#8a713f', 1.4); // head
    // ears
    blob(ctx, 9, 4, 2, 3, '#8a713f', '');
    blob(ctx, 17, 4, 2, 3, '#8a713f', '');
    // tail
    ctx.strokeStyle = '#8a713f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(13, 33);
    ctx.quadraticCurveTo(19, 38, 22, 34);
    ctx.stroke();
  });

  // --- powerups ---
  tex(scene, 'pu_coffee', 28, 28, (ctx) => {
    blob(ctx, 14, 16, 8, 8, '#fff', '#2e1c10', 1.8);
    ctx.fillStyle = '#6a4023';
    ctx.beginPath(); ctx.arc(14, 14, 5.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(23, 16, 3.5, -1.2, 1.2); ctx.stroke(); // handle
    // steam
    wline(ctx, 10, 6, 11, 1, 1.6);
    wline(ctx, 16, 6, 17, 1, 1.6);
  });
  tex(scene, 'pu_leaf', 28, 28, (ctx) => {
    ctx.save();
    ctx.translate(14, 14);
    ctx.rotate(0.6);
    blob(ctx, 0, 0, 10, 5.5, '#6fa84e', '#3d6628', 1.8);
    ctx.strokeStyle = '#3d6628';
    ctx.lineWidth = 1.2;
    wline(ctx, -9, 0, 9, 0, 0.6);
    ctx.restore();
  });
  tex(scene, 'pu_crumb', 28, 28, (ctx) => {
    blob(ctx, 13, 15, 8, 6.5, '#e0b268', '#9c7a3c', 1.8);
    blob(ctx, 19, 9, 4, 3, '#ecc582', '#9c7a3c', 1.4);
    ctx.fillStyle = '#9c7a3c';
    ctx.beginPath(); ctx.arc(10, 13, 1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(15, 17, 1, 0, 7); ctx.fill();
  });
  tex(scene, 'pu_umbrella', 28, 28, (ctx) => {
    blob(ctx, 14, 10, 11, 6, '#7e5aa3', '#4a3266', 1.8);
    ctx.strokeStyle = '#4a3266';
    ctx.lineWidth = 1.6;
    wline(ctx, 14, 10, 14, 24, 0.5);
    ctx.beginPath(); ctx.arc(16.5, 24, 2.5, 0, Math.PI); ctx.stroke();
  });

  // --- fx ---
  tex(scene, 'gas_puff', 72, 72, (ctx) => {
    const g = ctx.createRadialGradient(36, 36, 6, 36, 36, 34);
    g.addColorStop(0, 'rgba(190,200,160,0.85)');
    g.addColorStop(0.7, 'rgba(170,180,140,0.45)');
    g.addColorStop(1, 'rgba(170,180,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(36, 36, 34, 0, 7); ctx.fill();
  });
  tex(scene, 'smoke', 40, 40, (ctx) => {
    const g = ctx.createRadialGradient(20, 20, 3, 20, 20, 19);
    g.addColorStop(0, 'rgba(120,115,105,0.7)');
    g.addColorStop(1, 'rgba(120,115,105,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(20, 20, 19, 0, 7); ctx.fill();
  });
  tex(scene, 'dust', 18, 18, (ctx) => {
    const g = ctx.createRadialGradient(9, 9, 1, 9, 9, 8);
    g.addColorStop(0, 'rgba(180,165,140,0.6)');
    g.addColorStop(1, 'rgba(180,165,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(9, 9, 8, 0, 7); ctx.fill();
  });
  tex(scene, 'drop', 10, 10, (ctx) => {
    blob(ctx, 5, 5, 3.5, 3.5, 'rgba(150,200,230,0.9)', '');
  });
  tex(scene, 'confetti', 8, 8, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, 2, 6, 4);
  });
  tex(scene, 'spark', 8, 8, (ctx) => {
    const g = ctx.createRadialGradient(4, 4, 0.5, 4, 4, 4);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 8);
  });

  // vision cones (drawn pointing RIGHT, origin should be set to (0, 0.5))
  tex(scene, 'cone_view', 160, 120, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 160, 0);
    g.addColorStop(0, 'rgba(255,220,90,0.32)');
    g.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(2, 60);
    ctx.lineTo(158, 6);
    ctx.quadraticCurveTo(170, 60, 158, 114);
    ctx.closePath();
    ctx.fill();
  });
  tex(scene, 'cone_light', 200, 140, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 200, 0);
    g.addColorStop(0, 'rgba(255,250,200,0.4)');
    g.addColorStop(1, 'rgba(255,250,200,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(2, 70);
    ctx.lineTo(198, 18);
    ctx.quadraticCurveTo(210, 70, 198, 122);
    ctx.closePath();
    ctx.fill();
  });

  // --- UI ---
  tex(scene, 'heart', 30, 28, (ctx) => {
    ctx.fillStyle = '#e04338';
    ctx.strokeStyle = '#8a2a1e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 26);
    ctx.bezierCurveTo(-6, 12, 4, -4, 15, 8);
    ctx.bezierCurveTo(26, -4, 36, 12, 15, 26);
    ctx.fill();
    ctx.stroke();
  });
  tex(scene, 'joy_base', 110, 110, (ctx) => {
    blob(ctx, 55, 55, 50, 50, 'rgba(40,36,30,0.25)', 'rgba(255,255,255,0.35)', 3);
  });
  tex(scene, 'joy_stick', 52, 52, (ctx) => {
    blob(ctx, 26, 26, 22, 22, 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.6)', 2.5);
  });
  tex(scene, 'btn', 52, 52, (ctx) => {
    wrect(ctx, 3, 3, 46, 46, 'rgba(40,36,30,0.55)', 'rgba(255,255,255,0.5)', 2.5);
  });

  // --- building roof tiles (scaled onto rects) ---
  const roofColors = ['#d8a25e', '#cf8f6a', '#c9a86f', '#bc9a7c'];
  roofColors.forEach((col, i) => {
    tex(scene, `roof_${i}`, 64, 64, (ctx) => {
      wrect(ctx, 1, 1, 62, 62, col, '#4a3f33', 2.2);
      // parapet inner line
      ctx.strokeStyle = 'rgba(74,63,51,0.5)';
      ctx.lineWidth = 1.4;
      wline(ctx, 8, 8, 56, 8, 0.8);
      wline(ctx, 56, 8, 56, 56, 0.8);
      wline(ctx, 56, 56, 8, 56, 0.8);
      wline(ctx, 8, 56, 8, 8, 0.8);
      // rooftop clutter: AC units / water tanks
      wrect(ctx, 14 + i * 3, 16, 12, 9, '#9aa0ab', '#4a3f33', 1.2);
      blob(ctx, 42, 40, 7, 7, '#3a3f45', '#22262b', 1.4);
      wrect(ctx, 20, 40, 9, 9, '#8f8577', '#4a3f33', 1.2);
    });
  });

  // --- monuments (top view, stylized) ---
  tex(scene, 'india_gate', 160, 120, (ctx) => {
    // lawn plinth
    blob(ctx, 80, 60, 74, 52, '#c9b98a', '#8f7c4e', 2.5);
    // the arch, seen from above = big rectangle with an opening
    wrect(ctx, 50, 30, 60, 60, '#c0895a', '#6e4526', 2.5);
    ctx.fillStyle = '#8a5f38';
    ctx.fillRect(66, 30, 28, 60); // shadow of the arch opening
    wrect(ctx, 70, 50, 20, 20, '#e8dcc8', '#6e4526', 1.5); // amar jawan flame plinth
    ctx.fillStyle = '#e8963c';
    ctx.beginPath(); ctx.arc(80, 60, 4, 0, 7); ctx.fill(); // flame
  });

  tex(scene, 'parliament', 200, 200, (ctx) => {
    // circular colonnade (old Sansad Bhavan)
    blob(ctx, 100, 100, 88, 88, '#d3b078', '#8f7c4e', 3);
    blob(ctx, 100, 100, 62, 62, '#c9a25e', '#8f7c4e', 2);
    ctx.fillStyle = '#8f7c4e';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(100 + Math.cos(a) * 75, 100 + Math.sin(a) * 75, 3.4, 0, 7);
      ctx.fill();
    }
    blob(ctx, 100, 100, 30, 30, '#b98d48', '#6e5a2e', 2);
  });

  tex(scene, 'jantar', 200, 170, (ctx) => {
    // lawn
    blob(ctx, 100, 85, 95, 78, '#a8c488', '#6a8a4e', 2.5);
    // Samrat Yantra — the giant red triangle sundial (top view: wedge + quadrants)
    ctx.save();
    ctx.translate(100, 80);
    ctx.fillStyle = '#c2543c';
    ctx.strokeStyle = '#7e3020';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -50);
    ctx.lineTo(8, -50);
    ctx.lineTo(8, 50);
    ctx.lineTo(-8, 50);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // side quadrants
    ctx.beginPath(); ctx.arc(0, 30, 38, -0.5, 1.1); ctx.arc(0, 30, 22, 1.1, -0.5, true); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 30, 38, Math.PI - 1.1, Math.PI + 0.5); ctx.arc(0, 30, 22, Math.PI + 0.5, Math.PI - 1.1, true); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Misra Yantra-ish blob
    blob(ctx, -55, -20, 16, 22, '#c2543c', '#7e3020', 2);
    blob(ctx, 55, -10, 14, 18, '#c2543c', '#7e3020', 2);
    ctx.restore();
  });

  // fountain / CP inner circle
  tex(scene, 'cp_park', 200, 200, (ctx) => {
    blob(ctx, 100, 100, 92, 92, '#a8c488', '#6a8a4e', 3);
    blob(ctx, 100, 100, 40, 40, '#c9b98a', '#8f7c4e', 2);
    blob(ctx, 100, 100, 16, 16, '#a8cfd8', '#5e8a94', 2); // fountain
  });
}

/** Signboards get their own texture per string (drawn once at boot). */
export function signTexture(scene: Phaser.Scene, key: string, text: string): void {
  tex(scene, key, 150, 48, (ctx) => {
    wrect(ctx, 4, 4, 142, 30, '#ecdfb8', '#6e5a2e', 2.2);
    ctx.strokeStyle = '#6e5a2e';
    ctx.lineWidth = 2.5;
    wline(ctx, 40, 34, 40, 46, 0.6);
    wline(ctx, 110, 34, 110, 46, 0.6);
    ctx.fillStyle = '#4a3413';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = text.split(' ');
    let line1 = text, line2 = '';
    if (text.length > 24) {
      const half = Math.ceil(words.length / 2);
      line1 = words.slice(0, half).join(' ');
      line2 = words.slice(half).join(' ');
    }
    if (line2) {
      ctx.fillText(line1, 75, 13, 136);
      ctx.fillText(line2, 75, 25, 136);
    } else {
      ctx.fillText(line1, 75, 19, 136);
    }
  });
}
