/**
 * Game over: the classic centred overlay — the dimmed death scene stays
 * visible behind a random funny epitaph + retry. Retry works by tapping
 * anywhere, clicking the button, or pressing a key.
 */

import Phaser from 'phaser';
import { FONT, GAME_OVER_LINES } from '../config';
import { fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
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

    const go = (): void => {
      if (this.fired) return;
      this.fired = true;
      this.restartRun();
    };

    // Dim overlay (death scene visible behind) that also catches taps → retry.
    this.add.rectangle(0, 0, w, h, 0x1c1a17, 0.72).setOrigin(0)
      .setDepth(699).setInteractive().on('pointerdown', go);

    const line = Phaser.Utils.Array.GetRandom(GAME_OVER_LINES);
    const pct = Math.round(data.progress * 100);

    this.add.text(w / 2, h * 0.3, '💀', { fontSize: '52px' }).setOrigin(0.5).setDepth(701);
    const title = this.add.text(w / 2, h * 0.42, line, {
      fontFamily: FONT, fontSize: '32px', color: '#fffcf2', fontStyle: 'bold', align: 'center',
      wordWrap: { width: w * 0.85 }
    }).setOrigin(0.5).setDepth(701);
    title.setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 350, ease: 'Back.easeOut' });

    this.add.text(w / 2, h * 0.52, CAUSE_LINES[data.cause], {
      fontFamily: FONT, fontSize: '17px', color: '#d0c5a8', align: 'center'
    }).setOrigin(0.5).setDepth(701);

    this.add.text(w / 2, h * 0.6, `you scuttled ${pct}% of the way  ·  ⏱ ${fmtTime(data.elapsed)}`, {
      fontFamily: FONT, fontSize: '15px', color: '#8f8577'
    }).setOrigin(0.5).setDepth(701);

    const retry = this.add.text(w / 2, h * 0.73, '🔁  TRY AGAIN', {
      fontFamily: FONT, fontSize: '24px', color: '#2e1c10', fontStyle: 'bold',
      backgroundColor: '#e8b93c', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setDepth(702).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retry, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    retry.on('pointerdown', go);

    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-ENTER', go);
    this.input.keyboard?.once('keydown-R', go);
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
