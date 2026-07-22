/** Title screen: art, best time, controls, tap to start. */

import Phaser from 'phaser';
import { FONT } from '../config';
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

    // big wandering roach mascot
    const roach = this.add.sprite(cx, h * 0.24, 'roach_1').setScale(3.4);
    if (!this.anims.exists('roach_walk')) {
      this.anims.create({
        key: 'roach_walk',
        frames: [{ key: 'roach_0' }, { key: 'roach_1' }, { key: 'roach_2' }, { key: 'roach_1' }],
        frameRate: 14,
        repeat: -1
      });
    }
    roach.anims.play('roach_walk');
    this.tweens.add({ targets: roach, angle: 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(cx, h * 0.38, 'ROACH TO', {
      fontFamily: FONT, fontSize: '26px', color: '#6e4526'
    }).setOrigin(0.5);
    this.add.text(cx, h * 0.45, 'JANTAR MANTAR', {
      fontFamily: FONT, fontSize: '42px', color: '#8a2a1e', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, h * 0.53, 'One life. No weapons. Just vibes.\nReach the Immunity Zone where the roaches are dancing.', {
      fontFamily: FONT, fontSize: '15px', color: '#4a3f33', align: 'center'
    }).setOrigin(0.5);

    const isTouch = 'ontouchstart' in window;
    this.add.text(cx, h * 0.63, isTouch ? 'drag anywhere to scuttle' : 'WASD / arrow keys to scuttle', {
      fontFamily: FONT, fontSize: '14px', color: '#6e5a2e'
    }).setOrigin(0.5);

    const best = getBest();
    if (best !== null) {
      this.add.text(cx, h * 0.69, `fastest roach: ${fmtTime(best)}`, {
        fontFamily: FONT, fontSize: '14px', color: '#3d6628'
      }).setOrigin(0.5);
    }

    const start = this.add.text(cx, h * 0.79, isTouch ? '👉 TAP TO SCUTTLE 👈' : '👉 CLICK / SPACE TO SCUTTLE 👈', {
      fontFamily: FONT, fontSize: '22px', color: '#2e1c10', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: start, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(cx, h - 16, 'a loving satire · no roaches were harmed · avoid the lathi', {
      fontFamily: FONT, fontSize: '11px', color: '#8f8577'
    }).setOrigin(0.5);

    const go = (): void => {
      Audio.unlock();
      Audio.pickup();
      confettiBurst(this, cx, h * 0.4, 24);
      this.time.delayedCall(180, () => this.scene.start('Game'));
    };
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-ENTER', go);
  }
}
