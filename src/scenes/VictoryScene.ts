/** Victory: a dialog panel with the leaderboard + play again. Party rages behind. */

import Phaser from 'phaser';
import { CLEAR_FONT } from '../config';
import { recordWin, getBoard, fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { confettiBurst } from '../particles/Effects';
import { dialogPanel, roundButton, BTN_GREEN } from '../ui/Widgets';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Win');
  }

  private fired = false;

  create(data: { elapsed: number }): void {
    this.fired = false;
    this.scale.refresh();
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h * 0.46;
    const rank = recordWin(data.elapsed);
    const board = getBoard();

    const go = (): void => {
      if (this.fired) return;
      this.fired = true;
      Audio.stopPartyMusic();
      Audio.stopAmbience();
      this.scene.stop('UI');
      this.scene.start('Game');
    };

    // Invisible tap-anywhere backdrop so play-again can't be swallowed
    // (kept transparent so the party stays visible).
    this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setDepth(698)
      .setInteractive().on('pointerdown', go);

    const pw = Math.min(w * 0.88, 460);
    const ph = Math.min(h * 0.68, 620);
    dialogPanel(this, cx, cy, pw, ph);

    const title = this.add.text(cx, cy - ph * 0.4, '🎉  JANTAR MANTAR!  🎉', {
      fontFamily: CLEAR_FONT, fontSize: '25px', color: '#3d6628', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(701).setScale(0.4);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });

    this.add.text(cx, cy - ph * 0.29, 'You made it. The gutter-gang salutes you. 🫡', {
      fontFamily: CLEAR_FONT, fontSize: '15px', color: '#5a4326',
      align: 'center', wordWrap: { width: pw - 56 }
    }).setOrigin(0.5).setDepth(701);

    this.add.text(cx, cy - ph * 0.18, `your time:  ${fmtTime(data.elapsed)}${rank === 0 ? '   🏆 NEW RECORD!' : ''}`, {
      fontFamily: CLEAR_FONT, fontSize: '20px', color: rank === 0 ? '#2e8a2e' : '#6e4526', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(701);

    this.add.text(cx, cy - ph * 0.08, '— FASTEST ROACHES —', {
      fontFamily: CLEAR_FONT, fontSize: '13px', color: '#8f8577', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(701);

    board.forEach((e, i) => {
      const mine = i === rank;
      this.add.text(cx, cy - ph * 0.01 + i * 26,
        `${['🥇', '🥈', '🥉', '4.', '5.'][i]}   ${fmtTime(e.timeMs)}    ${e.date}${mine ? '   ← you' : ''}`, {
          fontFamily: CLEAR_FONT, fontSize: '15px', fontStyle: mine ? 'bold' : 'normal',
          color: mine ? '#8a2a1e' : '#6e5a2e'
        }).setOrigin(0.5).setDepth(701);
    });

    roundButton(this, cx, cy + ph * 0.4, 224, 58, 'PLAY AGAIN', BTN_GREEN, go);

    this.time.addEvent({
      delay: 900, repeat: -1,
      callback: () => confettiBurst(this, Math.random() * w, h * 0.1, 18)
    });

    this.input.keyboard?.once('keydown', go);
  }
}
