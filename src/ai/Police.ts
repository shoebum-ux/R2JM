/**
 * Police constable AI.
 *
 * State machine:  patrol → spot("!") → intercept → (lathi windup → dash) …
 * losing the player →  investigate last-seen → back to patrol.
 * Bread crumbs pull them into a 'distracted' state.
 *
 * They never chase forever: chases time out and leash out.
 */

import Phaser from 'phaser';
import { POLICE, CAT } from '../config';
import { BUILDINGS } from '../maps/DelhiMap';
import { floatEmoji } from '../particles/Effects';
import { Audio } from '../audio/AudioManager';

export type PoliceState =
  | 'patrol' | 'spot' | 'investigate' | 'intercept'
  | 'lathi_windup' | 'lathi_dash' | 'stagger' | 'distracted';

export interface PoliceTarget {
  x: number;
  y: number;
  hidden: boolean;
  dead: boolean;
}

/** Cheap line-of-sight: sample the sight line against building rects. */
export function losClear(x1: number, y1: number, x2: number, y2: number): boolean {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.floor(d / 40));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const b of BUILDINGS) {
      if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) return false;
    }
  }
  return true;
}

export class Police {
  sprite: Phaser.Physics.Matter.Sprite;
  cone: Phaser.GameObjects.Image;
  state: PoliceState = 'patrol';
  facing = 0;

  private scene: Phaser.Scene;
  private pts: { x: number; y: number }[];
  private loop: boolean;
  private wp = 0;
  private wpDir = 1;

  private stateT = 0;          // ms in current state
  private lastSeen = { x: 0, y: 0 };
  private losTimer = 0;
  private losOk = false;
  private lathiCd = 0;
  private gasCd = 4000;        // don't gas instantly at spawn
  private dashDir = new Phaser.Math.Vector2();
  private distractPt = { x: 0, y: 0 };
  private distractUntil = 0;
  private walkFlip = 0;

  /** Difficulty multipliers, set by GameScene each frame. */
  speedMult = 1;
  viewMult = 1;

  /** GameScene hooks. */
  onThrowGas: ((x: number, y: number) => void) | null = null;
  onCaught: (() => void) | null = null;

  constructor(scene: Phaser.Scene, pts: { x: number; y: number }[], loop = false) {
    this.scene = scene;
    this.pts = pts;
    this.loop = loop;
    const p0 = pts[0];
    this.sprite = scene.matter.add.sprite(p0.x, p0.y, 'cop_0', undefined, {
      shape: { type: 'circle', radius: 12 },
      frictionAir: 0.2
    });
    this.sprite.setFixedRotation();
    this.sprite.setCollisionCategory(CAT.POLICE);
    this.sprite.setCollidesWith(CAT.WORLD);
    this.sprite.setDepth(22);

    this.cone = scene.add.image(p0.x, p0.y, 'cone_view')
      .setOrigin(0, 0.5).setDepth(8).setAlpha(0.85);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  /** A searchlight (or noise) points them at a position to investigate. */
  alertTo(x: number, y: number): void {
    if (this.state === 'patrol' || this.state === 'investigate' || this.state === 'distracted') {
      this.lastSeen = { x, y };
      this.state = 'investigate';
      this.stateT = 0;
    }
  }

  distract(x: number, y: number, until: number): void {
    if (this.state === 'lathi_dash') return;
    this.state = 'distracted';
    this.stateT = 0;
    this.distractPt = { x, y };
    this.distractUntil = until;
    floatEmoji(this.scene, this.x, this.y - 24, '🍞', 18);
  }

  private canSee(t: PoliceTarget, now: number): boolean {
    if (t.hidden || t.dead) return false;
    const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
    const maxD = POLICE.viewDist * this.viewMult;
    if (d > maxD) return false;
    const ang = Math.atan2(t.y - this.y, t.x - this.x);
    if (Math.abs(Phaser.Math.Angle.Wrap(ang - this.facing)) > POLICE.coneHalfAngle && d > 40) return false;
    // throttled LOS raycast
    if (now > this.losTimer) {
      this.losTimer = now + POLICE.losCheckMs;
      this.losOk = losClear(this.x, this.y, t.x, t.y);
    }
    return this.losOk;
  }

  private moveToward(tx: number, ty: number, speed: number): boolean {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) {
      this.sprite.setVelocity(0, 0);
      return true;
    }
    const s = speed * this.speedMult / 60;
    this.sprite.setVelocity((dx / d) * s, (dy / d) * s);
    this.facing = Phaser.Math.Angle.RotateTo(this.facing, Math.atan2(dy, dx), 0.12);
    return false;
  }

  update(dtMs: number, t: PoliceTarget, now: number): void {
    this.stateT += dtMs;
    this.lathiCd -= dtMs;
    this.gasCd -= dtMs;
    const seen = this.canSee(t, now);
    if (seen) this.lastSeen = { x: t.x, y: t.y };

    switch (this.state) {
      case 'patrol': {
        const wp = this.pts[this.wp];
        if (this.moveToward(wp.x, wp.y, POLICE.speedPatrol)) this.advanceWp();
        if (seen) this.enterSpot();
        break;
      }
      case 'spot': {
        this.sprite.setVelocity(0, 0);
        this.facing = Phaser.Math.Angle.RotateTo(this.facing, Math.atan2(t.y - this.y, t.x - this.x), 0.2);
        if (this.stateT > POLICE.spotMs) {
          this.state = seen ? 'intercept' : 'investigate';
          this.stateT = 0;
        }
        break;
      }
      case 'investigate': {
        const arrived = this.moveToward(this.lastSeen.x, this.lastSeen.y, POLICE.speedInvestigate);
        if (seen) { this.state = 'intercept'; this.stateT = 0; }
        else if (arrived && this.stateT > 1600) { this.state = 'patrol'; this.stateT = 0; }
        // sweep gaze while searching
        if (arrived) this.facing += Math.sin(now / 300) * 0.04;
        break;
      }
      case 'intercept': {
        const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
        // Attempt interception: aim slightly ahead of the roach.
        this.moveToward(t.x, t.y, POLICE.speedChase);
        if (!seen && (this.stateT > POLICE.chaseMs || d > POLICE.loseDist)) {
          this.state = 'investigate';
          this.stateT = 0;
          floatEmoji(this.scene, this.x, this.y - 24, '❓', 18);
        } else if (seen && d < POLICE.lathiRange && this.lathiCd <= 0) {
          this.state = 'lathi_windup';
          this.stateT = 0;
          this.sprite.setVelocity(0, 0);
          floatEmoji(this.scene, this.x, this.y - 26, '💢', 18);
        } else if (seen && this.gasCd <= 0 && d > POLICE.gasThrowMin && d < POLICE.gasThrowMax) {
          this.gasCd = POLICE.gasCooldownMs;
          this.onThrowGas?.(t.x, t.y);
        }
        break;
      }
      case 'lathi_windup': {
        // telegraphed: officer freezes, flashes, then dashes
        this.sprite.setVelocity(0, 0);
        this.facing = Phaser.Math.Angle.RotateTo(this.facing, Math.atan2(t.y - this.y, t.x - this.x), 0.3);
        this.sprite.setTint(Math.floor(now / 90) % 2 ? 0xffffff : 0xff8a7a);
        if (this.stateT > POLICE.lathiWindupMs) {
          this.state = 'lathi_dash';
          this.stateT = 0;
          this.sprite.clearTint();
          this.dashDir.set(Math.cos(this.facing), Math.sin(this.facing));
          Audio.lathiSwish();
        }
        break;
      }
      case 'lathi_dash': {
        const s = POLICE.lathiSpeed / 60;
        this.sprite.setVelocity(this.dashDir.x * s, this.dashDir.y * s);
        if (this.stateT > POLICE.lathiDashMs) {
          this.state = 'stagger';
          this.stateT = 0;
          this.lathiCd = POLICE.lathiCooldownMs;
        }
        break;
      }
      case 'stagger': {
        this.sprite.setVelocity(0, 0);
        if (this.stateT > 750) {
          this.state = seen ? 'intercept' : 'investigate';
          this.stateT = 0;
        }
        break;
      }
      case 'distracted': {
        this.moveToward(this.distractPt.x, this.distractPt.y, POLICE.speedInvestigate);
        if (now > this.distractUntil) { this.state = 'patrol'; this.stateT = 0; }
        break;
      }
    }

    // catch check — touching a constable ends the run (unless he's snacking)
    if (!t.dead && this.state !== 'distracted') {
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      if (d < POLICE.catchDist) this.onCaught?.();
    }

    this.updateVisuals(now);
  }

  private enterSpot(): void {
    this.state = 'spot';
    this.stateT = 0;
    floatEmoji(this.scene, this.x, this.y - 26, '❗', 20);
    Audio.whistle();
  }

  private advanceWp(): void {
    if (this.loop) {
      this.wp = (this.wp + 1) % this.pts.length;
    } else {
      this.wp += this.wpDir;
      if (this.wp >= this.pts.length || this.wp < 0) {
        this.wpDir *= -1;
        this.wp += this.wpDir * 2;
      }
    }
  }

  private updateVisuals(now: number): void {
    // sprite rotation follows facing (texture drawn facing up)
    this.sprite.setRotation(this.facing + Math.PI / 2);

    // walk-cycle frames
    const moving = Math.hypot(this.sprite.body!.velocity.x, this.sprite.body!.velocity.y) > 0.2;
    let texKey = 'cop_0';
    if (this.state === 'lathi_windup') texKey = 'cop_windup';
    else if (this.state === 'lathi_dash') texKey = 'cop_dash';
    else if (moving) {
      this.walkFlip = Math.floor(now / 160) % 2;
      texKey = this.walkFlip ? 'cop_1' : 'cop_0';
    }
    if (this.sprite.texture.key !== texKey) this.sprite.setTexture(texKey);

    // vision cone
    const alert = this.state === 'intercept' || this.state === 'spot' ||
      this.state === 'lathi_windup' || this.state === 'lathi_dash';
    this.cone.setPosition(this.x, this.y);
    this.cone.setRotation(this.facing);
    this.cone.setScale((POLICE.viewDist * this.viewMult) / 160);
    this.cone.setTint(alert ? 0xff6a5a : 0xffffff);
    this.cone.setAlpha(this.state === 'distracted' ? 0.25 : 0.85);
  }

  destroy(): void {
    this.cone.destroy();
    this.sprite.destroy();
  }
}
