/**
 * GameScene — the whole run: central Delhi, one roach, one life.
 * Owns the map, the player, all AI and hazards; the UI scene reads from us.
 */

import Phaser from 'phaser';
import {
  WORLD, ROADS, RING, BUILDINGS, LAWNS, WATER, MONUMENTS, BARRICADES,
  CANNONS, LIGHTS, PATROLS, REINFORCEMENTS, TRAFFIC, BUS_ROUTE, POWERUPS,
  CARTS, SIGNS, PIGEONS, DOGS, treePositions, totalDist, START, GOAL
} from '../maps/DelhiMap';
import { CAT, PLAYER, DIFFICULTY, GAME_OVER_LINES, FONT } from '../config';
import { Player } from '../entities/Player';
import { Police } from '../ai/Police';
import { Vehicle, DetentionBus } from '../entities/Traffic';
import { Powerup } from '../entities/Powerup';
import { GasCloud, WaterCannon, Searchlight } from '../entities/Hazards';
import { Pigeon, Dog, Cart } from '../entities/Ambient';
import { Audio } from '../audio/AudioManager';
import {
  floatEmoji, confettiBurst, firework, splash, puffSmoke, makeDustTrail
} from '../particles/Effects';

export type DeathCause = 'detained' | 'bus' | 'traffic' | 'gas';

export default class GameScene extends Phaser.Scene {
  player!: Player;
  police: Police[] = [];
  traffic: Vehicle[] = [];
  bus!: DetentionBus;
  powerups: Powerup[] = [];
  gasClouds: GasCloud[] = [];
  cannons: WaterCannon[] = [];
  searchlights: Searchlight[] = [];
  private pigeons: Pigeon[] = [];
  private dogs: Dog[] = [];
  private carts: Cart[] = [];
  private partyRoaches: Phaser.GameObjects.Sprite[] = [];

  elapsed = 0;
  over = false;
  won = false;
  progress = 0;
  distRemaining = 0;
  gasBlur = 0;

  private startDist = 1;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private shieldEpisodeUntil = 0;
  private lightAlertAt = 0;
  private hornAt = 0;
  private ambienceAt = 0;
  private reinforced: boolean[] = [];

  constructor() {
    super('Game');
  }

  create(): void {
    // fresh run state (scene restarts reuse the instance)
    this.police = [];
    this.traffic = [];
    this.powerups = [];
    this.gasClouds = [];
    this.cannons = [];
    this.searchlights = [];
    this.pigeons = [];
    this.dogs = [];
    this.carts = [];
    this.partyRoaches = [];
    this.elapsed = 0;
    this.over = false;
    this.won = false;
    this.gasBlur = 0;
    this.shieldEpisodeUntil = 0;
    this.reinforced = DIFFICULTY.extraPatrolThresholds.map(() => false);
    Audio.stopPartyMusic();
    Audio.startGameMusic();

    this.matter.world.setGravity(0, 0);
    // Base ground layer: green everywhere (lawns sit on top as lighter patches).
    this.cameras.main.setBackgroundColor('#a6c47c');
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);

    this.drawGround();
    this.buildStatics();
    this.spawnEverything();

    this.startDist = totalDist();
    this.distRemaining = this.startDist;

    // camera
    this.cameras.main.startFollow(this.player.sprite, false, 0.09, 0.09);
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));

    // input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;

    makeDustTrail(this, this.player.sprite);

    this.scene.launch('UI');

    // intro banner
    const intro = this.add.text(this.player.x, this.player.y - 70, '🏛️ REACH JANTAR MANTAR!\nthe only safe place in the city', {
      fontFamily: FONT, fontSize: '17px', color: '#2e1c10', align: 'center',
      backgroundColor: '#fffcf2', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setDepth(950);
    this.tweens.add({ targets: intro, alpha: 0, delay: 3200, duration: 600, onComplete: () => intro.destroy() });
  }

  private applyZoom(): void {
    // Portrait (Instagram-Reel) viewport: base the zoom on the narrow width so
    // the roach and threats stay readable while a good stretch of road ahead
    // fits vertically. Zoomed out a touch so more of the map is visible.
    const z = Phaser.Math.Clamp(this.scale.width / 740, 0.5, 0.95);
    this.cameras.main.setZoom(z);
  }

  // ------------------------------------------------------------------ world

  /** Lawns, canals, roads — one static vector drawing. */
  private drawGround(): void {
    const g = this.add.graphics().setDepth(1);

    g.fillStyle(0xb8cf9a, 1);
    LAWNS.forEach((r) => g.fillRect(r.x, r.y, r.w, r.h));
    g.fillStyle(0xa8cfd8, 1);
    WATER.forEach((r) => g.fillRect(r.x, r.y, r.w, r.h));

    // road slabs
    for (const r of ROADS) {
      g.lineStyle(r.w, 0x8d8478, 1);
      g.lineBetween(r.x1, r.y1, r.x2, r.y2);
      // round the junctions
      g.fillStyle(0x8d8478, 1);
      g.fillCircle(r.x1, r.y1, r.w / 2);
      g.fillCircle(r.x2, r.y2, r.w / 2);
    }
    g.lineStyle(RING.w, 0x8d8478, 1);
    g.strokeCircle(RING.cx, RING.cy, RING.r);

    // dashed centre lines
    g.lineStyle(4, 0xe8e0c8, 0.7);
    for (const r of ROADS) {
      const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
      const ux = (r.x2 - r.x1) / len;
      const uy = (r.y2 - r.y1) / len;
      for (let d = 20; d < len - 30; d += 90) {
        g.lineBetween(r.x1 + ux * d, r.y1 + uy * d, r.x1 + ux * (d + 34), r.y1 + uy * (d + 34));
      }
    }

    // monuments
    MONUMENTS.forEach((m) => {
      this.add.image(m.x, m.y, m.key).setScale(m.scale).setDepth(m.key === 'cp_park' ? 2 : 4);
    });

    // the Immunity Zone ring
    const zone = this.add.circle(GOAL.x, GOAL.y, GOAL.r, 0x6fa84e, 0.14)
      .setStrokeStyle(4, 0x3d6628, 0.8).setDepth(5);
    this.tweens.add({ targets: zone, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(GOAL.x, GOAL.y - GOAL.r - 24, '🎉 IMMUNITY ZONE 🎉', {
      fontFamily: FONT, fontSize: '15px', color: '#3d6628', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  /** Static physics: world walls, buildings, barricades. */
  private buildStatics(): void {
    const filter = { category: CAT.WORLD };
    const T = 120;
    const opts = { isStatic: true, collisionFilter: filter };
    this.matter.add.rectangle(WORLD.w / 2, -T / 2, WORLD.w + T * 2, T, opts);
    this.matter.add.rectangle(WORLD.w / 2, WORLD.h + T / 2, WORLD.w + T * 2, T, opts);
    this.matter.add.rectangle(-T / 2, WORLD.h / 2, T, WORLD.h + T * 2, opts);
    this.matter.add.rectangle(WORLD.w + T / 2, WORLD.h / 2, T, WORLD.h + T * 2, opts);

    BUILDINGS.forEach((b, i) => {
      this.add.image(b.x + b.w / 2, b.y + b.h / 2, `roof_${i % 4}`)
        .setDisplaySize(b.w, b.h).setDepth(10);
      this.matter.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, opts);
    });

    BARRICADES.forEach((b) => {
      this.add.image(b.x, b.y, 'barricade').setRotation(b.angle).setDepth(17);
      this.matter.add.rectangle(b.x, b.y, 92, 20, { ...opts, angle: b.angle });
    });

    treePositions().forEach((t) => {
      this.add.image(t.x, t.y, t.v ? 'tree_1' : 'tree_0').setDepth(40).setAlpha(0.95);
    });

    SIGNS.forEach((s, i) => {
      this.add.image(s.x, s.y, `sign_${i}`).setDepth(16);
    });
  }

  private spawnEverything(): void {
    this.player = new Player(this, START.x, START.y);

    PATROLS.forEach((p) => this.addPolice(p.pts, p.loop ?? false));

    TRAFFIC.forEach((t) => {
      for (let i = 0; i < t.count; i++) {
        this.traffic.push(new Vehicle(this, t.pts, this.vehicleTex(t.type), t.speed, t.loop ?? false, i / t.count));
      }
    });

    this.bus = new DetentionBus(this, BUS_ROUTE);

    POWERUPS.forEach((p) => this.powerups.push(new Powerup(this, p.x, p.y, p.type)));
    CANNONS.forEach((c) => this.cannons.push(new WaterCannon(this, c.x, c.y, c.angle)));
    LIGHTS.forEach((l) => this.searchlights.push(new Searchlight(this, l.x, l.y)));

    PIGEONS.forEach((p) => this.pigeons.push(new Pigeon(this, p.x, p.y)));
    DOGS.forEach((d) => this.dogs.push(new Dog(this, d.x, d.y)));
    CARTS.forEach((c) => this.carts.push(new Cart(this, c.x, c.y)));

    // the party preview: roaches already vibing inside the Immunity Zone
    for (let i = 0; i < 18; i++) {
      this.spawnDancer(
        GOAL.x + (Math.random() - 0.5) * GOAL.r * 1.5,
        GOAL.y + (Math.random() - 0.5) * GOAL.r * 1.5
      );
    }
  }

  private vehicleTex(type: string): string {
    if (type === 'car') return `car_${Math.floor(Math.random() * 3)}`;
    return type;
  }

  private addPolice(pts: { x: number; y: number }[], loop: boolean): void {
    const cop = new Police(this, pts, loop);
    cop.onThrowGas = (x, y) => this.throwGas(cop, x, y);
    cop.onCaught = () => this.gameOver('detained');
    this.police.push(cop);
  }

  private spawnDancer(x: number, y: number): Phaser.GameObjects.Sprite {
    const s = this.add.sprite(x, y, 'roach_1').setDepth(15);
    s.setTint(Phaser.Display.Color.HSLToColor(Math.random(), 0.5, 0.55).color);
    s.setRotation(Math.random() * Math.PI * 2);
    this.tweens.add({
      targets: s, angle: s.angle + (Math.random() < 0.5 ? 40 : -40),
      duration: 260 + Math.random() * 240, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: s, scaleX: 1.25, scaleY: 0.8,
      duration: 200 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.partyRoaches.push(s);
    return s;
  }

  // ------------------------------------------------------------------ loop

  update(_time: number, delta: number): void {
    if (this.over && !this.won) return;
    const now = this.time.now;
    if (!this.over) this.elapsed += delta;

    const input = this.readInput();
    this.player.update(input, now);
    if (input.lengthSq() > 0.01 && !this.player.dead) Audio.step();

    if (!this.over) {
      this.updateThreats(delta, now);
      this.updatePickups(now);
      this.updateProgress(now);
      this.checkGoal();
    }

    // ambient charm runs even during the victory party
    this.pigeons.forEach((p) => p.update(this.player.x, this.player.y));
    this.dogs.forEach((d) => d.update(now, this.player.x, this.player.y));
    this.carts.forEach((c) => c.update(now, this.player.x, this.player.y));
    this.traffic.forEach((v) => v.update(delta));
  }

  private readInput(): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2();
    if (this.cursors.left.isDown || this.wasd.A.isDown) v.x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) v.x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) v.y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) v.y += 1;
    if (v.lengthSq() > 0) return v.normalize();
    // virtual joystick (UI scene owns it)
    const ui = this.scene.get('UI') as Phaser.Scene & { joyVec?: Phaser.Math.Vector2 };
    if (ui.joyVec) v.copy(ui.joyVec);
    return v;
  }

  private updateThreats(delta: number, now: number): void {
    const target = {
      x: this.player.x, y: this.player.y,
      hidden: this.player.hidden, dead: this.player.dead
    };
    for (const cop of this.police) {
      cop.speedMult = 1 + (DIFFICULTY.policeSpeedMax - 1) * this.progress;
      cop.viewMult = 1 + (DIFFICULTY.viewDistMax - 1) * this.progress;
      cop.update(delta, target, now);
    }

    // traffic squish + detention bus
    this.bus.update(delta);
    if (!this.player.dead) {
      if (this.bus.hitsBus(this.player.x, this.player.y)) {
        this.gameOver('bus');
        return;
      }
      for (const v of this.traffic) {
        if (v.hits(this.player.x, this.player.y)) {
          this.gameOver('traffic');
          return;
        }
      }
    }

    // random horns when traffic is near
    if (now > this.hornAt) {
      const near = this.traffic.some((v) =>
        Phaser.Math.Distance.Between(v.sprite.x, v.sprite.y, this.player.x, this.player.y) < 320);
      if (near && Math.random() < 0.4) Audio.horn();
      this.hornAt = now + 3500;
    }

    // water cannons
    for (const c of this.cannons) {
      c.update(delta);
      if (this.player.dead) continue;
      const push = c.hit(this.player.x, this.player.y);
      if (push) {
        if (now < this.shieldEpisodeUntil) continue;
        if (this.player.umbrellas > 0) {
          this.player.umbrellas--;
          this.shieldEpisodeUntil = now + 1600;
          floatEmoji(this, this.player.x, this.player.y - 24, '☂️');
          splash(this, this.player.x, this.player.y);
          Audio.splash();
        } else {
          this.player.push.add(push);
          this.player.push.limit(16);
          if (Math.random() < 0.2) {
            splash(this, this.player.x, this.player.y);
            Audio.splash();
            this.cameras.main.shake(120, 0.004);
          }
        }
      }
    }

    // tear gas
    this.player.gasSlow = false;
    let blur = 0;
    for (const gasCloud of this.gasClouds) {
      gasCloud.update(now);
      if (this.player.dead || gasCloud.dead) continue;
      const zone = gasCloud.check(this.player.x, this.player.y, now);
      if (zone === 'edge') {
        this.player.gasSlow = true;
        blur = Math.max(blur, 0.7);
      } else if (zone === 'core') {
        blur = 1;
        this.gameOver('gas');
        return;
      }
    }
    this.gasBlur = Phaser.Math.Linear(this.gasBlur, blur, 0.1);
    this.gasClouds = this.gasClouds.filter((c) => !c.dead);

    // searchlights alert nearby police
    for (const l of this.searchlights) {
      const caught = l.update(delta, this.player.x, this.player.y, this.player.hidden, now);
      if (caught && now > this.lightAlertAt && !this.player.dead) {
        this.lightAlertAt = now + 900;
        Audio.whistle();
        floatEmoji(this, this.player.x, this.player.y - 30, '🚨');
        [...this.police]
          .sort((a, b) =>
            Phaser.Math.Distance.Between(a.x, a.y, l.x, l.y) -
            Phaser.Math.Distance.Between(b.x, b.y, l.x, l.y))
          .slice(0, 2)
          .forEach((cop) => cop.alertTo(this.player.x, this.player.y));
      }
    }
  }

  private updatePickups(now: number): void {
    for (const p of this.powerups) {
      if (p.taken || this.player.dead) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 24) {
        this.applyPowerup(p, now);
      }
    }
  }

  private applyPowerup(p: Powerup, now: number): void {
    Audio.pickup();
    switch (p.type) {
      case 'coffee':
        this.player.coffeeUntil = now + PLAYER.coffeeMs;
        floatEmoji(this, p.x, p.y - 16, '☕ zoom!');
        break;
      case 'leaf':
        this.player.leafUntil = now + PLAYER.leafMs;
        floatEmoji(this, p.x, p.y - 16, '🍃 sneaky!');
        break;
      case 'umbrella':
        this.player.umbrellas++;
        floatEmoji(this, p.x, p.y - 16, '☂️ +1');
        break;
      case 'crumb': {
        floatEmoji(this, p.x, p.y - 16, '🍞 distraction!');
        const until = now + PLAYER.crumbMs;
        this.police.forEach((cop) => {
          if (Phaser.Math.Distance.Between(cop.x, cop.y, p.x, p.y) < PLAYER.crumbRadius) {
            cop.distract(p.x, p.y, until);
          }
        });
        break;
      }
    }
    p.take();
  }

  private updateProgress(now: number): void {
    this.distRemaining = Phaser.Math.Distance.Between(this.player.x, this.player.y, GOAL.x, GOAL.y);
    this.progress = Phaser.Math.Clamp(1 - this.distRemaining / this.startDist, 0, 1);

    // dynamic difficulty: reinforcements appear as you close in
    DIFFICULTY.extraPatrolThresholds.forEach((th, i) => {
      if (!this.reinforced[i] && this.progress > th && REINFORCEMENTS[i]) {
        this.reinforced[i] = true;
        const def = REINFORCEMENTS[i];
        this.addPolice(def.pts, def.loop ?? false);
        const cop = this.police[this.police.length - 1];
        puffSmoke(this, cop.x, cop.y, 8);
        Audio.whistle();
      }
    });

    // crowd ambience swells near the destination (throttled)
    if (now > this.ambienceAt) {
      this.ambienceAt = now + 500;
      Audio.setAmbience(Phaser.Math.Clamp(1 - this.distRemaining / 1600, 0, 1));
    }
  }

  private throwGas(cop: Police, tx: number, ty: number): void {
    // canister arcs from the cop to the target, then blooms
    const can = this.add.circle(cop.x, cop.y, 5, 0x556b5a).setStrokeStyle(2, 0x33443a).setDepth(35);
    floatEmoji(this, cop.x, cop.y - 26, '💨');
    this.tweens.add({
      targets: can,
      x: tx, y: ty,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => {
        can.destroy();
        Audio.hiss();
        this.gasClouds.push(new GasCloud(this, tx, ty, this.time.now));
      }
    });
  }

  private checkGoal(): void {
    if (this.player.dead || this.won) return;
    if (this.distRemaining < GOAL.r - 10) this.win();
  }

  // -------------------------------------------------------------- game over

  gameOver(cause: DeathCause): void {
    if (this.over) return;
    this.over = true;
    Audio.stopGameMusic();
    this.player.kill();
    this.cameras.main.shake(250, 0.008);

    const px = this.player.x;
    const py = this.player.y;

    switch (cause) {
      case 'bus': {
        // the bus vacuums the roach in — spin, shrink, gone
        Audio.suck();
        this.tweens.add({
          targets: this.player.sprite,
          x: this.bus.sprite.x, y: this.bus.sprite.y,
          scale: 0, angle: 720,
          duration: 850, ease: 'Cubic.easeIn'
        });
        break;
      }
      case 'traffic':
        Audio.squish();
        this.player.sprite.setScale(1.5, 0.25);
        puffSmoke(this, px, py, 5);
        break;
      case 'gas':
        Audio.hiss();
        this.player.sprite.setTint(0x8aa86a);
        this.tweens.add({ targets: this.player.sprite, alpha: 0, angle: 180, duration: 900 });
        break;
      case 'detained':
        Audio.whistle();
        floatEmoji(this, px, py - 30, '🚔', 26);
        this.tweens.add({ targets: this.player.sprite, angle: 90, scale: 0.8, duration: 500 });
        break;
    }

    Audio.stopAmbience();
    this.time.delayedCall(600, () => Audio.gameOverSting());
    this.time.delayedCall(1500, () => {
      this.scene.launch('Over', { cause, elapsed: this.elapsed, progress: this.progress });
      this.scene.pause();
    });
  }

  // ---------------------------------------------------------------- victory

  private win(): void {
    this.won = true;
    this.over = true;
    Audio.stopGameMusic();
    Audio.victoryFanfare();
    Audio.stopAmbience();
    Audio.startPartyMusic();
    this.cameras.main.shake(200, 0.006);
    floatEmoji(this, this.player.x, this.player.y - 30, '🎉', 30);

    // the crowd goes wild — spawn the horde
    for (let i = 0; i < 110; i++) {
      this.time.delayedCall(i * 22, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * GOAL.r * 1.35;
        const s = this.spawnDancer(GOAL.x + Math.cos(a) * r, GOAL.y + Math.sin(a) * r);
        s.setScale(0);
        this.tweens.add({ targets: s, scale: 0.8 + Math.random() * 0.5, duration: 300, ease: 'Back.easeOut' });
      });
    }

    // confetti + fireworks + disco tint forever
    this.time.addEvent({
      delay: 700, repeat: 12,
      callback: () => {
        confettiBurst(this,
          GOAL.x + (Math.random() - 0.5) * 300,
          GOAL.y + (Math.random() - 0.5) * 300, 30);
        firework(this,
          GOAL.x + (Math.random() - 0.5) * 500,
          GOAL.y - 100 - Math.random() * 200);
        Audio.boom();
      }
    });
    const disco = this.add.circle(GOAL.x, GOAL.y, GOAL.r * 1.4, 0xffffff, 0.12).setDepth(6);
    this.tweens.addCounter({
      from: 0, to: 359, duration: 2000, repeat: -1,
      onUpdate: (tw) => disco.setFillStyle(Phaser.Display.Color.HSLToColor((tw.getValue() ?? 0) / 360, 0.7, 0.6).color, 0.14)
    });

    this.time.delayedCall(2600, () => {
      this.scene.launch('Win', { elapsed: this.elapsed });
    });
  }
}
