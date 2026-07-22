/** Tear gas clouds, sweeping water cannons, rotating searchlights. */

import Phaser from 'phaser';
import { GAS, CANNON, LIGHT } from '../config';

// ----------------------------------------------------------------- tear gas

export class GasCloud {
  x: number;
  y: number;
  private born: number;
  private puffs: Phaser.GameObjects.Image[] = [];
  dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, now: number) {
    this.x = x;
    this.y = y;
    this.born = now;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = scene.add.image(x, y, 'gas_puff').setDepth(30).setScale(0.2).setAlpha(0.9);
      this.puffs.push(p);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * GAS.radius * 0.5,
        y: y + Math.sin(a) * GAS.radius * 0.5,
        scale: 1.9,
        angle: Phaser.Math.Between(-90, 90),
        duration: GAS.growMs,
        ease: 'Cubic.easeOut'
      });
      scene.tweens.add({
        targets: p,
        alpha: 0,
        delay: GAS.lifeMs - 900,
        duration: 900
      });
    }
  }

  /** current effective radius (grows in, then holds) */
  radius(now: number): number {
    const age = now - this.born;
    if (age >= GAS.lifeMs) return 0;
    return GAS.radius * Math.min(1, age / GAS.growMs);
  }

  /** 'none' | 'edge' (slow + blur) | 'core' (run over) */
  check(px: number, py: number, now: number): 'none' | 'edge' | 'core' {
    const r = this.radius(now);
    if (r <= 0) return 'none';
    const d = Math.hypot(px - this.x, py - this.y);
    if (d > r) return 'none';
    return d < r * GAS.coreFrac ? 'core' : 'edge';
  }

  update(now: number): void {
    if (!this.dead && now - this.born > GAS.lifeMs) {
      this.dead = true;
      this.puffs.forEach((p) => p.destroy());
    }
  }
}

// ------------------------------------------------------------- water cannon

export class WaterCannon {
  x: number;
  y: number;
  private baseAngle: number;
  private phase: number;
  angle: number;
  sprite: Phaser.GameObjects.Image;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, baseAngle: number) {
    this.x = x;
    this.y = y;
    this.baseAngle = baseAngle;
    this.angle = baseAngle;
    this.phase = Math.random() * Math.PI * 2;
    this.sprite = scene.add.image(x, y, 'cannon').setDepth(19);
    this.gfx = scene.add.graphics().setDepth(28);
  }

  update(dtMs: number): void {
    this.phase += CANNON.sweepSpeed * dtMs / 1000;
    this.angle = this.baseAngle + Math.sin(this.phase) * CANNON.sweepArc;
    this.sprite.setRotation(this.angle + Math.PI / 2); // barrel drawn facing up

    // draw the stream: fat wobbling dashed line of water
    this.gfx.clear();
    const ex = this.x + Math.cos(this.angle) * CANNON.length;
    const ey = this.y + Math.sin(this.angle) * CANNON.length;
    this.gfx.lineStyle(14, 0x9ecbe0, 0.55);
    this.gfx.lineBetween(this.x, this.y, ex, ey);
    this.gfx.lineStyle(6, 0xd5ecf5, 0.8);
    this.gfx.lineBetween(this.x, this.y, ex, ey);
    // spray blob at the end
    this.gfx.fillStyle(0xd5ecf5, 0.5);
    this.gfx.fillCircle(ex, ey, 16 + Math.sin(this.phase * 7) * 4);
  }

  /** Returns a push vector if (px,py) is inside the stream, else null. */
  hit(px: number, py: number): Phaser.Math.Vector2 | null {
    const ex = this.x + Math.cos(this.angle) * CANNON.length;
    const ey = this.y + Math.sin(this.angle) * CANNON.length;
    // distance point → segment
    const vx = ex - this.x, vy = ey - this.y;
    const wx = px - this.x, wy = py - this.y;
    const t = Phaser.Math.Clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
    if (t < 0.06) return null; // safe right at the truck
    const cx = this.x + vx * t, cy = this.y + vy * t;
    if (Math.hypot(px - cx, py - cy) > CANNON.hitDist) return null;
    return new Phaser.Math.Vector2(Math.cos(this.angle), Math.sin(this.angle)).scale(CANNON.push);
  }

  destroy(): void {
    this.gfx.destroy();
    this.sprite.destroy();
  }
}

// -------------------------------------------------------------- searchlight

export class Searchlight {
  x: number;
  y: number;
  private angle: number;
  private cone: Phaser.GameObjects.Image;
  private post: Phaser.GameObjects.Arc;
  private alertUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.cone = scene.add.image(x, y, 'cone_light').setOrigin(0, 0.5).setDepth(29).setAlpha(0.9);
    this.cone.setScale(LIGHT.length / 200);
    this.post = scene.add.circle(x, y, 7, 0x3a3f45).setStrokeStyle(2, 0x22262b).setDepth(30);
  }

  /** Rotates; returns true if (px,py) is caught in the beam this frame. */
  update(dtMs: number, px: number, py: number, hidden: boolean, now: number): boolean {
    this.angle += LIGHT.rotSpeed * dtMs / 1000;
    this.cone.setRotation(this.angle);
    const caught = !hidden && this.inBeam(px, py);
    if (caught) this.alertUntil = now + 400;
    this.cone.setTint(now < this.alertUntil ? 0xff5a4a : 0xffffff);
    return caught;
  }

  private inBeam(px: number, py: number): boolean {
    const d = Math.hypot(px - this.x, py - this.y);
    if (d > LIGHT.length || d < 14) return false;
    const a = Math.atan2(py - this.y, px - this.x);
    return Math.abs(Phaser.Math.Angle.Wrap(a - this.angle)) < LIGHT.halfAngle;
  }
}
