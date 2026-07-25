/**
 * Title screen. If public/menu-bg.png exists it's used as the full poster
 * background with just a PLAY button + music toggle; otherwise a procedural
 * flat forest/grass menu is drawn as a fallback.
 */

import Phaser from 'phaser';
import { CLEAR_FONT } from '../config';
import { getBest, fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { confettiBurst } from '../particles/Effects';
import { pixelButton, pixelToggle, PX_GREEN, PX_BLUE, PX_GREY } from '../ui/Widgets';

export default class MenuScene extends Phaser.Scene {
  private poster?: Phaser.GameObjects.Image;
  private playBtn?: Phaser.GameObjects.Container;
  private musicToggle?: { container: Phaser.GameObjects.Container; refresh: (on: boolean) => void };
  private hasPoster = false;
  private lastW = 0;
  private lastH = 0;

  constructor() {
    super('Menu');
  }

  init(): void {
    // The device-frame header is for gameplay only — hide it on the menu.
    const hdr = document.getElementById('frameHeader');
    if (hdr) hdr.style.display = 'none';
  }

  create(): void {
    this.scale.refresh();
    const { width: w, height: h } = this.scale;
    const cx = w / 2;
    const isTouch = 'ontouchstart' in window;
    this.hasPoster = this.textures.exists('menu_bg');

    const go = (): void => {
      Audio.unlock();
      Audio.pickup();
      confettiBurst(this, cx, h * 0.5, 24);
      this.time.delayedCall(180, () => this.scene.start('Game'));
    };

    if (this.hasPoster) {
      // sky blue fills any gap above the poster (matches the poster's sky)
      this.cameras.main.setBackgroundColor('#5aa9dc');
      this.poster = this.add.image(cx, h / 2, 'menu_bg').setDepth(0);
      this.playBtn = pixelButton(this, cx, h * 0.6, 230, 62, 'PLAY', '🪳', PX_GREEN, go);
    } else {
      this.playBtn = this.drawFallbackMenu(w, h, cx, isTouch, go);
    }

    // music on/off toggle, bottom-right (music only — SFX stay on)
    this.musicToggle = pixelToggle(
      this, 0, 0, 46, !Audio.musicMuted,
      (on) => (on ? { emoji: '🎵', pal: PX_BLUE } : { emoji: '🔇', pal: PX_GREY }),
      () => {
        Audio.unlock();
        const muted = Audio.toggleMusic();
        if (!muted) Audio.startGameMusic();
        this.musicToggle!.refresh(!muted);
      }
    );

    this.layoutMenu(w, h);
    // update() re-lays out whenever the frame size actually changes — no resize
    // handler + refresh() loop, which could thrash the layout.

    // Browsers block audio until a real user gesture — and that unlock must run
    // in the DOM event, not Phaser's (later) input step. Listen on the document
    // in the capture phase so it fires on the very first tap/key anywhere and
    // can't be swallowed; start the menu music there. It continues into the game.
    const remove = (): void => {
      document.removeEventListener('pointerdown', domStart, true);
      document.removeEventListener('touchstart', domStart, true);
      document.removeEventListener('keydown', domStart, true);
    };
    function domStart(): void {
      Audio.unlock();
      Audio.startGameMusic();
      remove();
    }
    document.addEventListener('pointerdown', domStart, true);
    document.addEventListener('touchstart', domStart, true);
    document.addEventListener('keydown', domStart, true);
    this.events.once('shutdown', remove);

    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-ENTER', go);
  }

  /** Re-layout whenever the frame size changes (robust against late resizes). */
  update(): void {
    const w = this.scale.width, h = this.scale.height;
    if (w < 2 || h < 2) return; // ignore transient zero-size frames
    if (w !== this.lastW || h !== this.lastH) {
      this.lastW = w;
      this.lastH = h;
      this.layoutMenu(w, h);
    }
  }

  /** Cover the poster to the full frame and place PLAY + music button. */
  private layoutMenu(w: number, h: number): void {
    if (w < 2 || h < 2) return;
    const cx = w / 2;
    if (this.poster) {
      // Scale to fill the width, anchor to the bottom (so all the bottom
      // content shows). Any leftover space at the top is sky-blue background.
      const src = this.textures.get('menu_bg').getSourceImage();
      const scale = w / src.width;
      const dispH = src.height * scale;
      this.poster.setScale(scale).setPosition(cx, h - dispH / 2);
      const posterTop = h - dispH;
      this.playBtn?.setPosition(cx, posterTop + dispH * 0.62 - 80);
    } else {
      this.playBtn?.setPosition(cx, h * 0.68);
    }
    this.musicToggle?.container.setPosition(w - 16 - 23, h - 16 - 23);
  }

  // ---------------------------------------------- procedural fallback menu

  private drawFallbackMenu(w: number, h: number, cx: number, isTouch: boolean, go: () => void): Phaser.GameObjects.Container {
    this.drawForest(w, h);

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

    this.drawRibbon(cx, panelY + 6, Math.min(panelW + 20, w * 0.92));

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
    this.tweens.add({ targets: roach, angle: 4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

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

    const play = pixelButton(this, cx, h * 0.68, 220, 60, 'PLAY', '🪳', PX_GREEN, go);

    const best = getBest();
    if (best !== null) {
      this.add.text(cx, h * 0.775, `🏆  fastest roach:  ${fmtTime(best)}`, {
        fontFamily: CLEAR_FONT, fontSize: '15px', color: '#3d6628', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(8);
    }

    this.drawControls(cx, h, isTouch);
    return play;
  }

  // ------------------------------------------------------------ forest scene

  private drawForest(w: number, h: number): void {
    this.cameras.main.setBackgroundColor('#ece3cf');
    const g = this.add.graphics().setDepth(0);

    g.fillGradientStyle(0x86c9ec, 0x86c9ec, 0xc6e7f4, 0xc6e7f4, 1);
    g.fillRect(0, 0, w, h * 0.66);

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

    const mountain = (x: number, baseY: number, mw: number, mh: number): void => {
      g.fillStyle(0x8b9a86, 1);
      g.fillTriangle(x - mw, baseY, x + mw, baseY, x, baseY - mh);
      g.fillStyle(0xeef4f0, 1);
      g.fillTriangle(x - mw * 0.34, baseY - mh * 0.66, x + mw * 0.34, baseY - mh * 0.66, x, baseY - mh);
    };
    mountain(w * 0.16, h * 0.52, 90, 150);
    mountain(w * 0.85, h * 0.5, 105, 175);
    mountain(w * 0.5, h * 0.54, 80, 120);

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

    g.fillStyle(0x93c96f, 1);
    g.beginPath();
    g.moveTo(0, h * 0.84);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.84 - Math.sin(x / 70) * 12);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fillPath();
  }

  private drawRibbon(cx: number, cy: number, width: number): void {
    const g = this.add.graphics().setDepth(7);
    const half = width / 2;
    const bh = 58, top = cy - bh / 2;
    g.fillStyle(0x3f6f24, 1);
    g.fillTriangle(cx - half - 14, top + 6, cx - half + 18, top + 6, cx - half + 18, top + bh + 10);
    g.fillTriangle(cx + half + 14, top + 6, cx + half - 18, top + 6, cx + half - 18, top + bh + 10);
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

  private drawControls(cx: number, h: number, isTouch: boolean): void {
    if (isTouch) {
      this.add.text(cx, h * 0.9, 'Drag anywhere to move the roach', {
        fontFamily: CLEAR_FONT, fontSize: '15px', color: '#f4ecd8', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(9).setShadow(0, 2, 'rgba(20,40,15,0.7)', 0);
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
    this.add.text(cx, h * 0.955, 'move   ·   P pause   ·   R restart', {
      fontFamily: CLEAR_FONT, fontSize: '13px', color: '#f4ecd8', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(9).setShadow(0, 1, 'rgba(20,40,15,0.8)', 0);
  }

  private drawKeycap(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, label: string): void {
    const hh = size / 2, rr = 6;
    g.fillStyle(0xc9bda0, 1);
    g.fillRoundedRect(cx - hh, cy - hh + 3, size, size, rr);
    g.fillStyle(0xf6efdf, 1);
    g.fillRoundedRect(cx - hh, cy - hh, size, size - 3, rr);
    g.fillStyle(0xffffff, 0.75);
    g.fillRoundedRect(cx - hh + 4, cy - hh + 4, size - 8, 6, 3);
    g.lineStyle(2, 0x6e5a2e, 1);
    g.strokeRoundedRect(cx - hh, cy - hh, size, size - 3, rr);
    this.add.text(cx, cy - 2, label, {
      fontFamily: CLEAR_FONT, fontSize: `${Math.floor(size * 0.44)}px`, color: '#4a3f33', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(9);
  }
}
