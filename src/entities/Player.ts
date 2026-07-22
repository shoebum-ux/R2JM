/** The tiny cockroach. One life. No attacks. Only vibes and pathfinding. */

import Phaser from 'phaser';
import { PLAYER, CAT, GAS } from '../config';

export class Player {
  sprite: Phaser.Physics.Matter.Sprite;
  private scene: Phaser.Scene;

  coffeeUntil = 0;
  leafUntil = 0;
  umbrellas = 0;
  gasSlow = false;
  dead = false;
  /** external push (water cannon), decays each frame */
  push = new Phaser.Math.Vector2();

  private idleTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.matter.add.sprite(x, y, 'roach_1', undefined, {
      shape: { type: 'circle', radius: PLAYER.radius },
      frictionAir: 0.18,
      friction: 0,
      restitution: 0.1
    });
    this.sprite.setFixedRotation();
    this.sprite.setCollisionCategory(CAT.PLAYER);
    this.sprite.setCollidesWith(CAT.WORLD);
    this.sprite.setDepth(20);

    if (!scene.anims.exists('roach_walk')) {
      scene.anims.create({
        key: 'roach_walk',
        frames: [
          { key: 'roach_0' }, { key: 'roach_1' }, { key: 'roach_2' }, { key: 'roach_1' }
        ],
        frameRate: 14,
        repeat: -1
      });
    }
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get hidden(): boolean { return this.scene.time.now < this.leafUntil; }

  /** input: normalized vector (from keys or joystick). */
  update(input: Phaser.Math.Vector2, now: number): void {
    if (this.dead) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    let speed = PLAYER.speed;
    if (now < this.coffeeUntil) speed *= PLAYER.coffeeSpeedMult;
    if (this.gasSlow) speed *= GAS.slowMult;

    // Matter velocity ≈ px per 60Hz step
    const vx = input.x * speed / 60 + this.push.x;
    const vy = input.y * speed / 60 + this.push.y;
    this.sprite.setVelocity(vx, vy);
    this.push.scale(0.86); // cannon push decays

    const moving = input.lengthSq() > 0.01 || this.push.lengthSq() > 0.04;
    if (moving) {
      const ang = Math.atan2(vy, vx) + Math.PI / 2;
      this.sprite.setRotation(Phaser.Math.Angle.RotateTo(this.sprite.rotation, ang, 0.25));
      if (!this.sprite.anims.isPlaying) this.sprite.anims.play('roach_walk');
      this.stopIdle();
    } else {
      this.sprite.anims.stop();
      this.sprite.setTexture('roach_1');
      this.startIdle();
    }

    // camouflage look
    this.sprite.setAlpha(this.hidden ? 0.45 : 1);
    this.sprite.setTint(this.hidden ? 0x9fd08a : 0xffffff);
  }

  private startIdle(): void {
    if (this.idleTween) return;
    this.idleTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.06,
      scaleY: 0.95,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private stopIdle(): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
      this.sprite.setScale(1);
    }
  }

  kill(): void {
    this.dead = true;
    this.stopIdle();
    this.sprite.anims.stop();
  }
}
