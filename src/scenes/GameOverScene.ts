/**
 * Game over: a light overlay that keeps the death location visible, a marker
 * on the spot you were caught, and a compact popup at the bottom. Retry works
 * by tapping anywhere, clicking the button, or pressing a key — so it can't be
 * swallowed by the backdrop.
 */

import Phaser from 'phaser';
import { CLEAR_FONT, GAME_OVER_LINES } from '../config';
import { fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { dialogPanel, roundButton, BTN_ORANGE } from '../ui/Widgets';
import type GameScene from './GameScene';
import type { DeathCause } from './GameScene';

const CAUSE_LINES: Record<DeathCause, string> = {
  detained: 'The Delhi Police regrets nothing.',
  bus: 'Detention bus. Non-AC. Tragic.',
  traffic: 'Delhi traffic claims another soul.',
  gas: "That wasn't fog, little one."
};

export default class GameOverScene extends Phaser.Scene {
  private fired = false;

  constructor() {
    super('Over');
  }

  create(data: { cause: DeathCause; elapsed: number; progress: number }): void {
    this.fired = false;
    this.scale.refresh();
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    const go = (): void => {
      if (this.fired) return;
      this.fired = true;
      this.restartRun();
    };

    // Light dim (death scene stays visible) that also catches taps → retry.
    this.add.rectangle(0, 0, w, h, 0x1c1a17, 0.5).setOrigin(0)
      .setDepth(699).setInteractive().on('pointerdown', go);

    // Marker on the spot where the roach was caught.
    this.markDeathSpot(w, h);

    // Compact popup near the bottom, leaving the death spot visible above.
    const cyc = h * 0.76;
    const pw = Math.min(w * 0.9, 470);
    const ph = Math.min(h * 0.34, 300);
    dialogPanel(this, cx, cyc, pw, ph);

    const line = Phaser.Utils.Array.GetRandom(GAME_OVER_LINES);
    const pct = Math.round(data.progress * 100);

    const title = this.add.text(cx, cyc - ph * 0.31, `💀  ${line}`, {
      fontFamily: CLEAR_FONT, fontSize: '23px', color: '#8a2a1e', fontStyle: 'bold',
      align: 'center', wordWrap: { width: pw - 50 }
    }).setOrigin(0.5).setDepth(701);
    title.setScale(0.7);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });

    this.add.text(cx, cyc - ph * 0.02, CAUSE_LINES[data.cause], {
      fontFamily: CLEAR_FONT, fontSize: '15px', color: '#6e5a2e',
      align: 'center', wordWrap: { width: pw - 50 }
    }).setOrigin(0.5).setDepth(701);

    this.add.text(cx, cyc + ph * 0.14, `scuttled ${pct}%   ·   ⏱ ${fmtTime(data.elapsed)}`, {
      fontFamily: CLEAR_FONT, fontSize: '13px', color: '#8f8577', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(701);

    roundButton(this, cx, cyc + ph * 0.35, 210, 52, 'TRY AGAIN', BTN_ORANGE, go);

    this.add.text(cx, h - 16, 'tap anywhere or press any key to retry', {
      fontFamily: CLEAR_FONT, fontSize: '12px', color: '#d0c5a8'
    }).setOrigin(0.5).setDepth(701);

    this.input.keyboard?.once('keydown', go);
  }

  /** Draw a pulsing marker where the roach died (mapped from the game camera). */
  private markDeathSpot(w: number, h: number): void {
    const gs = this.scene.get('Game') as GameScene;
    if (!gs || !gs.player) return;
    const wv = gs.cameras.main.worldView;
    const sx = Phaser.Math.Clamp((gs.player.x - wv.x) / wv.width * w, 40, w - 40);
    const sy = Phaser.Math.Clamp((gs.player.y - wv.y) / wv.height * h, 40, h * 0.5);

    const ring = this.add.circle(sx, sy, 24, 0xff5a4a, 0)
      .setStrokeStyle(4, 0xff5a4a, 0.9).setDepth(700);
    this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 1100, repeat: -1 });
    this.add.text(sx, sy, '☠️', { fontSize: '30px' }).setOrigin(0.5).setDepth(701);
    this.add.text(sx, sy - 34, 'caught here', {
      fontFamily: CLEAR_FONT, fontSize: '12px', color: '#ffd7cf', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(701).setShadow(0, 1, 'rgba(0,0,0,0.6)', 0);
  }

  private restartRun(): void {
    Audio.stopPartyMusic();
    Audio.stopGameMusic();
    Audio.stopAmbience();
    Audio.pickup();
    this.scene.stop('UI');
    this.scene.start('Game');
  }
}
