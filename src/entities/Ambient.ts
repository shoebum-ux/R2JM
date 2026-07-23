/**
 * Ambient life: pigeons that scatter, street dogs that mooch around,
 * food carts, and occasional dialogue bubbles. Pure charm, no gameplay.
 */

import Phaser from 'phaser';
import { FONT } from '../config';

const DOG_LINES = ['bhow?', 'bhow bhow', '*sniff sniff*', '...roach?', '*ignores you*'];
const CART_LINES = ['Samose garam!', 'Chai chai chaaai', 'Bhaiya ek plate', 'Scene kya hai?', 'Aaj band hai kya?', 'melody?'];
const PIGEON_LINES = ['gutur goo', 'gutergang gutergang'];

export function speechBubble(scene: Phaser.Scene, x: number, y: number, text: string): void {
  const label = scene.add.text(0, 0, text, {
    fontFamily: FONT,
    fontSize: '20px',
    color: '#2e1c10'
  }).setOrigin(0.5);
  const w = label.width + 24;
  const h = label.height + 16;
  const bg = scene.add.graphics();
  bg.fillStyle(0xfffcf2, 0.96);
  bg.lineStyle(2.5, 0x4a3f33, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
  bg.fillTriangle(-7, h / 2 - 1, 7, h / 2 - 1, 0, h / 2 + 11);
  const c = scene.add.container(x, y - 34, [bg, label]).setDepth(940).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y: y - 46, duration: 200 });
  scene.time.delayedCall(2400, () => {
    scene.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
  });
}

export class Pigeon {
  sprite: Phaser.GameObjects.Image;
  private home: { x: number; y: number };
  private flying = false;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.home = { x, y };
    this.sprite = scene.add.image(x, y, 'pigeon').setDepth(12).setRotation(Math.random() * 6.28);
    // idle peck
    scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.85,
      duration: 300 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      repeatDelay: 800 + Math.random() * 1500
    });
  }

  update(px: number, py: number): void {
    if (this.flying) return;
    if (Math.hypot(px - this.home.x, py - this.home.y) < 55) {
      this.flying = true;
      if (Math.random() < 0.3) speechBubble(this.scene, this.sprite.x, this.sprite.y, Phaser.Utils.Array.GetRandom(PIGEON_LINES));
      const a = Math.atan2(this.home.y - py, this.home.x - px);
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.home.x + Math.cos(a) * 220,
        y: this.home.y + Math.sin(a) * 220,
        alpha: 0,
        scale: 1.5,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          // glide back home a while later
          this.scene.time.delayedCall(5000 + Math.random() * 4000, () => {
            this.sprite.setPosition(this.home.x, this.home.y).setAlpha(1).setScale(1);
            this.flying = false;
          });
        }
      });
    }
  }
}

export class Dog {
  sprite: Phaser.GameObjects.Image;
  private home: { x: number; y: number };
  private scene: Phaser.Scene;
  private nextWander = 0;
  private nextBark = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.home = { x, y };
    this.sprite = scene.add.image(x, y, 'dog').setDepth(12);
  }

  update(now: number, px: number, py: number): void {
    if (now > this.nextWander) {
      this.nextWander = now + 2500 + Math.random() * 3500;
      const tx = this.home.x + (Math.random() - 0.5) * 130;
      const ty = this.home.y + (Math.random() - 0.5) * 130;
      this.sprite.setRotation(Math.atan2(ty - this.sprite.y, tx - this.sprite.x) + Math.PI / 2);
      this.scene.tweens.add({ targets: this.sprite, x: tx, y: ty, duration: 1400, ease: 'Sine.easeInOut' });
    }
    if (now > this.nextBark && Math.hypot(px - this.sprite.x, py - this.sprite.y) < 120) {
      this.nextBark = now + 9000 + Math.random() * 8000;
      speechBubble(this.scene, this.sprite.x, this.sprite.y, Phaser.Utils.Array.GetRandom(DOG_LINES));
    }
  }
}

export class Cart {
  sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private nextCall = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.image(x, y, 'cart').setDepth(13);
  }

  update(now: number, px: number, py: number): void {
    if (now > this.nextCall && Math.hypot(px - this.sprite.x, py - this.sprite.y) < 260) {
      this.nextCall = now + 12000 + Math.random() * 10000;
      speechBubble(this.scene, this.sprite.x, this.sprite.y, Phaser.Utils.Array.GetRandom(CART_LINES));
    }
  }
}
