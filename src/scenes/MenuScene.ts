/** Title screen: crisp hero roach, clear fonts, 8-bit Start Game button. */

import Phaser from 'phaser';
import { CLEAR_FONT } from '../config';
import { getBest, fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { confettiBurst } from '../particles/Effects';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width: w, height: h } = this.scale;
    this.cameras.main.setBackgroundColor('#ece3cf');
    const cx = w / 2;
    const isTouch = 'ontouchstart' in window;

    // --- crisp hero roach (rocks gently) ---
    const roach = this.add.image(cx, h * 0.17, 'roach_hero').setScale(0.82);
    this.tweens.add({
      targets: roach, angle: 5, y: h * 0.17 - 8,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: roach, scaleX: 0.86, scaleY: 0.78,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // --- title (clear, bold) ---
    this.add.text(cx, h * 0.31, 'ROACH TO', {
      fontFamily: CLEAR_FONT, fontSize: '24px', color: '#6e4526', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, h * 0.37, 'JANTAR MANTAR', {
      fontFamily: CLEAR_FONT, fontSize: '40px', color: '#8a2a1e', fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(0, 2, 'rgba(0,0,0,0.18)', 0);

    // --- tagline, one per line ---
    const tagline = [
      { t: '❤️  One Life', c: '#8a2a1e' },
      { t: '🚫  No Weapons', c: '#6e5a2e' },
      { t: '✨  Just Vibes', c: '#3d6628' }
    ];
    tagline.forEach((line, i) => {
      this.add.text(cx, h * 0.45 + i * 30, line.t, {
        fontFamily: CLEAR_FONT, fontSize: '19px', color: line.c, fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    // --- 8-bit START GAME button ---
    const go = (): void => {
      Audio.unlock();
      Audio.pickup();
      confettiBurst(this, cx, h * 0.4, 24);
      this.time.delayedCall(180, () => this.scene.start('Game'));
    };
    this.makePixelButton(cx, h * 0.62, 232, 62, 'START GAME', go);

    // --- subtle controls below the button ---
    const controls = isTouch
      ? ['Drag anywhere to move the roach', 'buttons for  ⏸ pause   🔊 mute']
      : ['Move:  W A S D   /   ↑ ← ↓ →', 'P  pause      M  mute      R  restart'];
    controls.forEach((c, i) => {
      this.add.text(cx, h * 0.72 + i * 22, c, {
        fontFamily: CLEAR_FONT, fontSize: '14px', color: '#8f8577'
      }).setOrigin(0.5);
    });

    // --- best time ---
    const best = getBest();
    if (best !== null) {
      this.add.text(cx, h * 0.82, `🏆  fastest roach:  ${fmtTime(best)}`, {
        fontFamily: CLEAR_FONT, fontSize: '15px', color: '#3d6628', fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // --- footer ---
    this.add.text(cx, h - 18, 'a loving satire · no roaches were harmed · avoid the lathi', {
      fontFamily: CLEAR_FONT, fontSize: '11px', color: '#a89f8c'
    }).setOrigin(0.5);

    // keyboard / anywhere-tap shortcuts still work
    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-ENTER', go);
  }

  /** A chunky 8-bit arcade button (chamfered, 3-tone bevel) with a play icon. */
  private makePixelButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): void {
    const OUTLINE = 0x24331a, FACE = 0x6fb84e, HI = 0x93d873, LO = 0x498f37;
    const ch = 10; // corner chamfer → pixel-block feel
    const g = this.add.graphics();

    const octagon = (gx: number, gy: number, gw: number, gh: number, c: number, color: number): void => {
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(gx + c, gy);
      g.lineTo(gx + gw - c, gy);
      g.lineTo(gx + gw, gy + c);
      g.lineTo(gx + gw, gy + gh - c);
      g.lineTo(gx + gw - c, gy + gh);
      g.lineTo(gx + c, gy + gh);
      g.lineTo(gx, gy + gh - c);
      g.lineTo(gx, gy + c);
      g.closePath();
      g.fillPath();
    };

    octagon(-w / 2, -h / 2, w, h, ch, OUTLINE);                 // dark border
    octagon(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, ch - 3, FACE); // face
    const innerL = -w / 2 + 5 + (ch - 3);
    const innerW = w - 10 - 2 * (ch - 3);
    g.fillStyle(HI, 1);
    g.fillRect(innerL, -h / 2 + 5, innerW, 9);                   // top highlight
    g.fillStyle(LO, 1);
    g.fillRect(innerL, h / 2 - 5 - 11, innerW, 11);              // bottom shadow

    // play triangle (matches the arcade-button reference)
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-w / 2 + 30, -12, -w / 2 + 30, 12, -w / 2 + 50, 0);

    const txt = this.add.text(14, -1, label, {
      fontFamily: CLEAR_FONT, fontSize: '25px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    txt.setShadow(0, 2, 'rgba(0,0,0,0.35)', 0);

    const btn = this.add.container(x, y, [g, txt]).setSize(w, h);
    btn.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (btn.input) btn.input.cursor = 'pointer';

    // gentle attention pulse
    this.tweens.add({ targets: btn, scale: 1.04, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    btn.on('pointerover', () => btn.setY(y - 2));
    btn.on('pointerout', () => btn.setY(y));
    btn.on('pointerdown', () => btn.setY(y + 3));
    btn.on('pointerup', () => { btn.setY(y); onClick(); });
  }
}
