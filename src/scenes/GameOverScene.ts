/** Game over: a proper dialog panel with a random funny epitaph + retry. */

import Phaser from 'phaser';
import { CLEAR_FONT, GAME_OVER_LINES } from '../config';
import { fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { dialogPanel, roundButton, BTN_ORANGE } from '../ui/Widgets';
import type { DeathCause } from './GameScene';

const CAUSE_LINES: Record<DeathCause, string> = {
  detained: 'The Delhi Police regrets nothing.',
  bus: 'Detention bus. Non-AC. Tragic.',
  traffic: 'Delhi traffic claims another soul.',
  gas: "That wasn't fog, little one."
};

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('Over');
  }

  create(data: { cause: DeathCause; elapsed: number; progress: number }): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h * 0.5;

    // dim + swallow clicks behind the dialog
    this.add.rectangle(0, 0, w, h, 0x1c1a17, 0.72).setOrigin(0).setInteractive().setDepth(699);

    const pw = Math.min(w * 0.88, 460);
    const ph = Math.min(h * 0.58, 540);
    dialogPanel(this, cx, cy, pw, ph);

    const line = Phaser.Utils.Array.GetRandom(GAME_OVER_LINES);
    const pct = Math.round(data.progress * 100);

    this.add.text(cx, cy - ph * 0.37, '💀', { fontSize: '58px' }).setOrigin(0.5).setDepth(701);

    const title = this.add.text(cx, cy - ph * 0.13, line, {
      fontFamily: CLEAR_FONT, fontSize: '30px', color: '#8a2a1e', fontStyle: 'bold',
      align: 'center', wordWrap: { width: pw - 56 }
    }).setOrigin(0.5).setDepth(701);
    title.setScale(0.7);
    this.tweens.add({ targets: title, scale: 1, duration: 350, ease: 'Back.easeOut' });

    this.add.text(cx, cy + ph * 0.05, CAUSE_LINES[data.cause], {
      fontFamily: CLEAR_FONT, fontSize: '17px', color: '#6e5a2e',
      align: 'center', wordWrap: { width: pw - 56 }
    }).setOrigin(0.5).setDepth(701);

    this.add.text(cx, cy + ph * 0.19, `scuttled ${pct}%  ·  ⏱ ${fmtTime(data.elapsed)}`, {
      fontFamily: CLEAR_FONT, fontSize: '15px', color: '#8f8577', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(701);

    const go = (): void => this.restartRun();
    roundButton(this, cx, cy + ph * 0.36, 224, 58, 'TRY AGAIN', BTN_ORANGE, go);

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
