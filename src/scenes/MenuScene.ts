/**
 * Title screen — flat forest/grass game UI (inspired by the references in the
 * project's Figma file): sky, hills, flat trees & mountains, a green ribbon
 * banner title, a cream content panel, the animated hi-res roach, a rounded
 * Start button, and keyboard-keycap controls along the bottom.
 *
 * The in-game frame header is hidden here (it's compulsory in-game only).
 */

import Phaser from 'phaser';
import { CLEAR_FONT } from '../config';
import { getBest, fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { confettiBurst } from '../particles/Effects';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(): void {
    // The device-frame header is for gameplay only — hide it on the menu.
    const hdr = document.getElementById('frameHeader');
    if (hdr) hdr.style.display = 'none';
  }

  create(): void {
    this.scale.refresh(); // header hidden → the game area just grew; resync size
    const { width: w, height: h } = this.scale;
    const cx = w / 2;
    const isTouch = 'ontouchstart' in window;

    this.drawForest(w, h);

    // --- cream content panel ---
    const panelX = w * 0.07, panelY = h * 0.1, panelW = w * 0.86, panelH = h * 0.75;
    const panel = this.add.graphics().setDepth(5);
    panel.fillStyle(0x1c1a17, 0.18);
    panel.fillRoundedRect(panelX + 4, panelY + 8, panelW, panelH, 26);
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 26);
    panel.fillStyle(0xf1e7cd, 1);
    panel.fillRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 20);
    panel.lineStyle(2, 0xd9c9a0, 1);
    panel.strokeRoundedRect(panelX + 14, panelY + 14, panelW - 28, panelH - 28, 14);

    // --- green ribbon banner (title) overlapping the panel top ---
    this.drawRibbon(cx, panelY + 6, Math.min(panelW + 20, w * 0.92));

    // --- animated hi-res roach ---
    if (!this.anims.exists('roach_menu_walk')) {
      this.anims.create({
        key: 'roach_menu_walk',
        frames: [{ key: 'roach_m0' }, { key: 'roach_m1' }, { key: 'roach_m2' }, { key: 'roach_m1' }],
        frameRate: 7,
        repeat: -1
      });
    }
    const roach = this.add.sprite(cx, h * 0.32, 'roach_m1').setDepth(7).setScale(0.82);
    roach.play('roach_menu_walk');
    this.tweens.add({
      targets: roach, angle: 4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // --- tagline, one per line (dark on the cream panel) ---
    const tagline = [
      { t: '❤️  One Life', c: '#8a2a1e' },
      { t: '🚫  No Weapons', c: '#6e5a2e' },
      { t: '✨  Just Vibes', c: '#3d6628' }
    ];
    tagline.forEach((line, i) => {
      this.add.text(cx, h * 0.47 + i * 30, line.t, {
        fontFamily: CLEAR_FONT, fontSize: '20px', color: line.c, fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(8);
    });

    // --- START GAME button (moved a bit lower) ---
    const go = (): void => {
      Audio.unlock();
      Audio.pickup();
      confettiBurst(this, cx, h * 0.45, 24);
      this.time.delayedCall(180, () => this.scene.start('Game'));
    };
    this.makeRoundButton(cx, h * 0.68, 236, 60, 'START GAME', go);

    // --- best time ---
    const best = getBest();
    if (best !== null) {
      this.add.text(cx, h * 0.775, `🏆  fastest roach:  ${fmtTime(best)}`, {
        fontFamily: CLEAR_FONT, fontSize: '15px', color: '#3d6628', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(8);
    }

    // --- controls at the very bottom (on the grass) ---
    this.drawControls(cx, h, isTouch);

    // keyboard shortcuts still work
    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-ENTER', go);
  }

  // ------------------------------------------------------------ forest scene

  private drawForest(w: number, h: number): void {
    const g = this.add.graphics().setDepth(0);

    // sky
    g.fillGradientStyle(0x86c9ec, 0x86c9ec, 0xc6e7f4, 0xc6e7f4, 1);
    g.fillRect(0, 0, w, h * 0.66);

    // clouds
    const cloud = (x: number, y: number, s: number): void => {
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(x, y, 16 * s);
      g.fillCircle(x + 18 * s, y + 4 * s, 13 * s);
      g.fillCircle(x - 18 * s, y + 4 * s, 12 * s);
      g.fillCircle(x, y + 8 * s, 15 * s);
    };
    cloud(w * 0.2, h * 0.09, 1);
    cloud(w * 0.78, h * 0.06, 0.8);
    cloud(w * 0.62, h * 0.15, 0.6);

    // mountains (flat, snow-capped)
    const mountain = (x: number, baseY: number, mw: number, mh: number): void => {
      g.fillStyle(0x8b9a86, 1);
      g.fillTriangle(x - mw, baseY, x + mw, baseY, x, baseY - mh);
      g.fillStyle(0xeef4f0, 1);
      g.fillTriangle(x - mw * 0.34, baseY - mh * 0.66, x + mw * 0.34, baseY - mh * 0.66, x, baseY - mh);
    };
    mountain(w * 0.16, h * 0.52, 90, 150);
    mountain(w * 0.85, h * 0.5, 105, 175);
    mountain(w * 0.5, h * 0.54, 80, 120);

    // hills (layered, wavy)
    const hill = (baseY: number, amp: number, wavelen: number, color: number): void => {
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, baseY - Math.sin(x / wavelen) * amp);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.fillPath();
    };
    hill(h * 0.5, 22, 130, 0x5f9a48);
    hill(h * 0.58, 26, 90, 0x75ad57);

    // trees on the hills
    const pine = (x: number, y: number, s: number): void => {
      g.fillStyle(0x6e4a2a, 1);
      g.fillRect(x - 3 * s, y, 6 * s, 12 * s);
      const layer = (dy: number, ww: number, hh: number, c: number): void => {
        g.fillStyle(c, 1);
        g.fillTriangle(x - ww, y + dy, x + ww, y + dy, x, y + dy - hh);
      };
      layer(2 * s, 20 * s, 30 * s, 0x3c7742);
      layer(-10 * s, 17 * s, 26 * s, 0x468650);
      layer(-22 * s, 13 * s, 22 * s, 0x53975c);
    };
    const bush = (x: number, y: number, s: number): void => {
      g.fillStyle(0x54a04a, 1);
      g.fillCircle(x, y, 15 * s);
      g.fillCircle(x - 12 * s, y + 4 * s, 11 * s);
      g.fillCircle(x + 12 * s, y + 4 * s, 11 * s);
    };
    pine(w * 0.08, h * 0.56, 1);
    pine(w * 0.93, h * 0.55, 1.1);
    pine(w * 0.28, h * 0.6, 0.7);
    bush(w * 0.7, h * 0.6, 0.9);
    bush(w * 0.42, h * 0.62, 0.7);

    // grass foreground
    g.fillStyle(0x93c96f, 1);
    g.beginPath();
    g.moveTo(0, h * 0.84);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.84 - Math.sin(x / 70) * 12);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fillPath();

    // grass tufts + a couple of mushrooms
    g.lineStyle(3, 0x6aa851, 1);
    for (let i = 0; i < 14; i++) {
      const x = 20 + i * (w / 14) + (i % 2) * 10;
      const y = h * 0.9 + (i % 3) * 8;
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x - 4, y - 10);
      g.moveTo(x, y); g.lineTo(x, y - 13);
      g.moveTo(x, y); g.lineTo(x + 4, y - 10);
      g.strokePath();
    }
    const mushroom = (x: number, y: number): void => {
      g.fillStyle(0xf0e6cf, 1);
      g.fillRect(x - 3, y - 6, 6, 8);
      g.fillStyle(0xd0553f, 1);
      g.fillEllipse(x, y - 6, 18, 12);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(x - 3, y - 7, 2);
      g.fillCircle(x + 3, y - 5, 1.6);
    };
    mushroom(w * 0.14, h * 0.96);
    mushroom(w * 0.83, h * 0.94);
  }

  // ----------------------------------------------------------------- ribbon

  private drawRibbon(cx: number, cy: number, width: number): void {
    const g = this.add.graphics().setDepth(7);
    const half = width / 2;
    const bh = 58, top = cy - bh / 2;
    // ribbon tails (folds)
    g.fillStyle(0x3f6f24, 1);
    g.fillTriangle(cx - half - 14, top + 6, cx - half + 18, top + 6, cx - half + 18, top + bh + 10);
    g.fillTriangle(cx + half + 14, top + 6, cx + half - 18, top + 6, cx + half - 18, top + bh + 10);
    // main banner
    g.fillStyle(0x5f9a34, 1);
    g.fillRoundedRect(cx - half, top, width, bh, 12);
    g.fillStyle(0x7ab84a, 1);
    g.fillRoundedRect(cx - half + 6, top + 5, width - 12, bh * 0.42, 8);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeRoundedRect(cx - half, top, width, bh, 12);

    this.add.text(cx, cy - 11, 'ROACH TO', {
      fontFamily: CLEAR_FONT, fontSize: '13px', color: '#eaf6d8', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(8);
    this.add.text(cx, cy + 8, 'JANTAR MANTAR', {
      fontFamily: CLEAR_FONT, fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(8).setShadow(0, 2, 'rgba(30,60,20,0.6)', 0);
  }

  // ----------------------------------------------------------- round button

  private makeRoundButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): void {
    const g = this.add.graphics();
    const r = h / 2;
    g.fillStyle(0x1c1a17, 0.2);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);      // drop shadow
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, r + 5); // white ring
    g.fillStyle(0xd06f28, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);          // dark base
    g.fillStyle(0xef8b3c, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h - 8, r);      // face
    g.fillStyle(0xffb15e, 0.9);
    g.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, 12, 8); // top gloss
    // play triangle
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-w / 2 + 34, -13, -w / 2 + 34, 13, -w / 2 + 56, 0);

    const txt = this.add.text(16, -2, label, {
      fontFamily: CLEAR_FONT, fontSize: '25px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    txt.setShadow(0, 2, 'rgba(120,60,20,0.5)', 0);

    const btn = this.add.container(x, y, [g, txt]).setDepth(9).setSize(w + 10, h + 10);
    btn.setInteractive(new Phaser.Geom.Rectangle(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10), Phaser.Geom.Rectangle.Contains);
    if (btn.input) btn.input.cursor = 'pointer';
    this.tweens.add({ targets: btn, scale: 1.04, duration: 640, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    btn.on('pointerover', () => btn.setY(y - 2));
    btn.on('pointerout', () => btn.setY(y));
    btn.on('pointerdown', () => btn.setY(y + 3));
    btn.on('pointerup', () => { btn.setY(y); onClick(); });
  }

  // --------------------------------------------------------------- controls

  private drawControls(cx: number, h: number, isTouch: boolean): void {
    if (isTouch) {
      this.add.text(cx, h * 0.9, 'Drag anywhere to move the roach', {
        fontFamily: CLEAR_FONT, fontSize: '15px', color: '#f4ecd8', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(9).setShadow(0, 2, 'rgba(20,40,15,0.7)', 0);
      this.add.text(cx, h * 0.94, 'buttons:  ⏸ pause    🔊 mute', {
        fontFamily: CLEAR_FONT, fontSize: '13px', color: '#eaf6d8'
      }).setOrigin(0.5).setDepth(9).setShadow(0, 1, 'rgba(20,40,15,0.7)', 0);
      return;
    }

    const g = this.add.graphics().setDepth(8);
    const size = 30, gap = 5, groupGap = 20;
    const keys = ['W', 'A', 'S', 'D', '', '↑', '←', '↓', '→'];
    const totalW = 8 * size + 7 * gap + groupGap;
    let x = cx - totalW / 2 + size / 2;
    const y = h * 0.9;

    keys.forEach((k) => {
      if (k === '') { x += groupGap; return; }
      this.drawKeycap(g, x, y, size, k);
      x += size + gap;
    });

    this.add.text(cx, h * 0.955, 'move   ·   P pause   ·   M mute   ·   R restart', {
      fontFamily: CLEAR_FONT, fontSize: '13px', color: '#f4ecd8', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(9).setShadow(0, 1, 'rgba(20,40,15,0.8)', 0);
  }

  /** A little cream keyboard keycap with a top gloss + a label. */
  private drawKeycap(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, label: string): void {
    const hh = size / 2, rr = 6;
    g.fillStyle(0xc9bda0, 1);
    g.fillRoundedRect(cx - hh, cy - hh + 3, size, size, rr);        // edge/shadow
    g.fillStyle(0xf6efdf, 1);
    g.fillRoundedRect(cx - hh, cy - hh, size, size - 3, rr);        // face
    g.fillStyle(0xffffff, 0.75);
    g.fillRoundedRect(cx - hh + 4, cy - hh + 4, size - 8, 6, 3);    // gloss
    g.lineStyle(2, 0x6e5a2e, 1);
    g.strokeRoundedRect(cx - hh, cy - hh, size, size - 3, rr);      // border
    this.add.text(cx, cy - 2, label, {
      fontFamily: CLEAR_FONT, fontSize: `${Math.floor(size * 0.44)}px`, color: '#4a3f33', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(9);
  }
}
