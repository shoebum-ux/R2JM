/** Victory overlay: leaderboard + play again. The party rages on behind it. */

import Phaser from 'phaser';
import { FONT } from '../config';
import { recordWin, getBoard, fmtTime } from '../systems/Save';
import { Audio } from '../audio/AudioManager';
import { confettiBurst } from '../particles/Effects';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Win');
  }

  create(data: { elapsed: number }): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const rank = recordWin(data.elapsed);
    const board = getBoard();

    // translucent header band — keep the dancing roaches visible below
    this.add.rectangle(0, 0, w, h * 0.66, 0x1c1a17, 0.62).setOrigin(0);

    const title = this.add.text(w / 2, h * 0.09, '🎉 JANTAR MANTAR! 🎉', {
      fontFamily: FONT, fontSize: '34px', color: '#ffe9a3', fontStyle: 'bold'
    }).setOrigin(0.5).setScale(0.3);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });

    this.add.text(w / 2, h * 0.17, 'You made it. The gutter-gang salutes you. 🫡🪳', {
      fontFamily: FONT, fontSize: '16px', color: '#fffcf2'
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.24, `your time: ${fmtTime(data.elapsed)}${rank === 0 ? '  🏆 NEW RECORD!' : ''}`, {
      fontFamily: FONT, fontSize: '20px', color: rank === 0 ? '#6fd06f' : '#e8e0c8', fontStyle: 'bold'
    }).setOrigin(0.5);

    // leaderboard
    this.add.text(w / 2, h * 0.32, '— FASTEST ROACHES —', {
      fontFamily: FONT, fontSize: '14px', color: '#8f8577'
    }).setOrigin(0.5);
    board.forEach((e, i) => {
      const mine = i === rank;
      this.add.text(w / 2, h * 0.37 + i * 24,
        `${['🥇', '🥈', '🥉', '4.', '5.'][i]}  ${fmtTime(e.timeMs)}   ${e.date}${mine ? '  ← you' : ''}`, {
          fontFamily: FONT, fontSize: '15px',
          color: mine ? '#ffe9a3' : '#d0c5a8'
        }).setOrigin(0.5);
    });

    const again = this.add.text(w / 2, h * 0.58, '🪳  PLAY AGAIN', {
      fontFamily: FONT, fontSize: '22px', color: '#2e1c10', fontStyle: 'bold',
      backgroundColor: '#6fd06f', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: again, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.time.addEvent({
      delay: 900, repeat: -1,
      callback: () => confettiBurst(this, Math.random() * w, h * 0.1, 18)
    });

    const go = (): void => {
      Audio.stopPartyMusic();
      Audio.stopAmbience();
      this.scene.stop('UI');
      this.scene.start('Game');
    };
    again.on('pointerdown', go);
    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-ENTER', go);
  }
}
