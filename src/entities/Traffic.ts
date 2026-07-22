/**
 * Traffic vehicles + the detention bus. Plain (non-physics) sprites that
 * follow polylines; collisions with the roach are resolved with cheap
 * oriented-box math — no Matter bodies needed for 20+ movers.
 */

import Phaser from 'phaser';
import { BUS } from '../config';

export interface PathPt { x: number; y: number; }

export class Vehicle {
  sprite: Phaser.GameObjects.Sprite;
  protected pts: PathPt[];
  protected loop: boolean;
  protected speed: number;
  protected seg = 0;
  protected t = 0; // 0..1 along current segment
  protected dir = 1;
  protected halfW: number;
  protected halfL: number;

  constructor(scene: Phaser.Scene, pts: PathPt[], type: string, speed: number, loop = false, startFrac = 0) {
    this.pts = pts;
    this.loop = loop;
    this.speed = speed;
    this.sprite = scene.add.sprite(pts[0].x, pts[0].y, type).setDepth(18);
    this.halfW = this.sprite.width / 2;
    this.halfL = this.sprite.height / 2;
    // distribute along the path
    const total = this.segCount();
    const target = startFrac * total;
    this.seg = Math.floor(target) % Math.max(1, total);
    this.t = target - Math.floor(target);
    this.place();
  }

  protected segCount(): number {
    return this.loop ? this.pts.length : this.pts.length - 1;
  }

  protected segPts(i: number): [PathPt, PathPt] {
    const a = this.pts[i % this.pts.length];
    const b = this.pts[(i + 1) % this.pts.length];
    return [a, b];
  }

  update(dtMs: number): void {
    const [a, b] = this.segPts(this.seg);
    const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    this.t += (this.speed * dtMs / 1000) / len;
    while (this.t >= 1) {
      this.t -= 1;
      this.seg++;
      if (!this.loop && this.seg >= this.segCount()) {
        this.seg = 0; // wrap: respawn at route start
        this.t = 0;
      } else {
        this.seg %= this.segCount();
      }
    }
    this.place();
  }

  protected place(): void {
    const [a, b] = this.segPts(this.seg);
    this.sprite.x = a.x + (b.x - a.x) * this.t;
    this.sprite.y = a.y + (b.y - a.y) * this.t;
    this.sprite.rotation = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  }

  /** Oriented-box hit test against a point (the roach). */
  hits(px: number, py: number, pad = 6): boolean {
    const dx = px - this.sprite.x;
    const dy = py - this.sprite.y;
    const rot = -this.sprite.rotation;
    const lx = dx * Math.cos(rot) - dy * Math.sin(rot);
    const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
    return Math.abs(lx) < this.halfW + pad && Math.abs(ly) < this.halfL + pad;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

/** The detention bus: prowls its route, beacon flashing. Touch = detained. */
export class DetentionBus extends Vehicle {
  private beacon: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, pts: PathPt[], speedMult = 1) {
    super(scene, pts, 'bus_police', BUS.speed * speedMult, false, 0.3);
    this.sprite.setDepth(24);
    this.beacon = scene.add.circle(pts[0].x, pts[0].y, 5, 0xe04338).setDepth(25);
    scene.tweens.add({
      targets: this.beacon,
      alpha: 0.15,
      duration: 320,
      yoyo: true,
      repeat: -1
    });
  }

  update(dtMs: number): void {
    super.update(dtMs);
    // beacon rides near the front of the bus
    const a = this.sprite.rotation - Math.PI / 2;
    this.beacon.setPosition(
      this.sprite.x + Math.cos(a) * 42,
      this.sprite.y + Math.sin(a) * 42
    );
  }

  hitsBus(px: number, py: number): boolean {
    return this.hits(px, py, 4);
  }

  destroy(): void {
    this.beacon.destroy();
    super.destroy();
  }
}
