/** Pickups: coffee (speed), leaf (camouflage), crumb (distraction), umbrella (cannon shield). */

import Phaser from 'phaser';
import type { PowerupType } from '../maps/DelhiMap';

export const POWERUP_EMOJI: Record<PowerupType, string> = {
  coffee: '☕', leaf: '🍃', crumb: '🍞', umbrella: '☂️'
};

export class Powerup {
  sprite: Phaser.GameObjects.Image;
  type: PowerupType;
  taken = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerupType) {
    this.type = type;
    this.sprite = scene.add.image(x, y, `pu_${type}`).setDepth(14);
    scene.tweens.add({
      targets: this.sprite,
      y: y - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: this.sprite,
      angle: 8,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  take(): void {
    this.taken = true;
    this.sprite.destroy();
  }
}
