/**
 * UIScene — screen-space overlay: one-life heart, distance, buttons,
 * minimap, virtual joystick, gas blur, goal compass, pause.
 */

import Phaser from 'phaser';
import type GameScene from './GameScene';
import { WORLD, ROADS, RING, GOAL } from '../maps/DelhiMap';
import { FONT, CLEAR_FONT } from '../config';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { Audio } from '../audio/AudioManager';
import { fmtTime } from '../systems/Save';

const MAP_W = 132;

export default class UIScene extends Phaser.Scene {
  joyVec = new Phaser.Math.Vector2();

  private game_!: GameScene;
  private joy: VirtualJoystick | null = null;
  private heart!: Phaser.GameObjects.Image;
  private lifeLabel!: Phaser.GameObjects.Text;
  private distLabel!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;
  private buffLabel!: Phaser.GameObjects.Text;
  private mapBg!: Phaser.GameObjects.Graphics;
  private mapDots!: Phaser.GameObjects.Graphics;
  private gasOverlay!: Phaser.GameObjects.Rectangle;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private compass!: Phaser.GameObjects.Text;
  private btns: { img: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text }[] = [];
  private muteTxt!: Phaser.GameObjects.Text;
  private mapAt = 0;
  private mapScale = MAP_W / WORLD.w;
  // Horizontal window left edge so the Connaught Place ring is centred.
  private mapViewX0 = RING.cx - WORLD.w / 2;

  constructor() {
    super('UI');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.joyVec.set(0, 0);
    this.btns = [];

    this.gasOverlay = this.add.rectangle(0, 0, 10, 10, 0xa8b478, 0).setOrigin(0).setDepth(500);

    this.heart = this.add.image(0, 0, 'heart').setDepth(600);
    this.tweens.add({ targets: this.heart, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.lifeLabel = this.add.text(0, 0, 'ONE LIFE', {
      fontFamily: FONT, fontSize: '13px', color: '#8a2a1e', fontStyle: 'bold'
    }).setDepth(600);
    this.buffLabel = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#2e1c10' }).setDepth(600);

    this.distLabel = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '17px', color: '#2e1c10', fontStyle: 'bold', align: 'right'
    }).setOrigin(1, 0).setDepth(600);
    this.timeLabel = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '13px', color: '#6e5a2e', align: 'right'
    }).setOrigin(1, 0).setDepth(600);

    this.mapBg = this.add.graphics().setDepth(590);
    this.mapDots = this.add.graphics().setDepth(591);

    this.compass = this.add.text(0, 0, '🏛️', { fontSize: '20px' }).setOrigin(0.5).setDepth(600).setAlpha(0.85);

    this.makeButtons();
    this.makePauseOverlay();

    if ('ontouchstart' in window) {
      this.joy = new VirtualJoystick(this);
    }

    // keyboard shortcuts
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => this.toggleMute());
    this.input.keyboard?.on('keydown-R', () => this.restartRun());

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.joy?.destroy();
    });
  }

  // ---------------------------------------------------------------- buttons

  private makeButtons(): void {
    const mk = (emoji: string, cb: () => void): { img: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text } => {
      const img = this.add.image(0, 0, 'btn').setDepth(600).setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, 0, emoji, { fontSize: '22px' }).setOrigin(0.5).setDepth(601);
      img.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        cb();
      });
      const b = { img, txt };
      this.btns.push(b);
      return b;
    };
    mk('⏸️', () => this.togglePause());
    this.muteTxt = mk(Audio.muted ? '🔇' : '🔊', () => this.toggleMute()).txt;
    mk('🔁', () => this.restartRun());
  }

  private toggleMute(): void {
    const muted = Audio.toggleMute();
    this.muteTxt.setText(muted ? '🔇' : '🔊');
  }

  private togglePause(): void {
    if (this.game_.over) return;
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      this.pauseOverlay.setVisible(false);
      Audio.startGameMusic();
    } else {
      this.scene.pause('Game');
      this.pauseOverlay.setVisible(true);
      Audio.stopGameMusic();
    }
  }

  restartRun(): void {
    Audio.stopPartyMusic();
    Audio.stopGameMusic();
    Audio.stopAmbience();
    this.scene.stop('Over');
    this.scene.stop('Win');
    const g = this.scene.get('Game');
    this.scene.stop('UI');
    g.scene.restart();
  }

  private makePauseOverlay(): void {
    const dim = this.add.rectangle(0, 0, 10, 10, 0x1c1a17, 0.6).setOrigin(0);
    const panel = this.add.graphics();
    const label = this.add.text(0, 0, '⏸  PAUSED\n\nthe roach waits…\ntap ⏸ or press P to resume', {
      fontFamily: CLEAR_FONT, fontSize: '22px', color: '#5a4326', align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.pauseOverlay = this.add.container(0, 0, [dim, panel, label]).setDepth(700).setVisible(false);
    this.pauseOverlay.setData('parts', { dim, panel, label });
  }

  // ----------------------------------------------------------------- layout

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.gasOverlay.setSize(w, h);
    this.heart.setPosition(28, 28);
    this.lifeLabel.setPosition(48, 20);
    this.buffLabel.setPosition(16, 48);
    this.distLabel.setPosition(w - 14, 12);
    this.timeLabel.setPosition(w - 14, 38);

    // buttons bottom-right (inset to clear the frame's rounded corner)
    this.btns.forEach((b, i) => {
      const x = w - 40 - i * 58;
      const y = h - 44;
      b.img.setPosition(x, y);
      b.txt.setPosition(x, y);
    });

    const parts = this.pauseOverlay.getData('parts') as {
      dim: Phaser.GameObjects.Rectangle; panel: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text;
    };
    parts.dim.setSize(w, h);
    parts.label.setPosition(w / 2, h / 2);
    // cream dialog panel behind the pause text
    const pw = Math.min(w * 0.82, 420), ph = 220;
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2;
    parts.panel.clear();
    parts.panel.fillStyle(0xffffff, 1);
    parts.panel.fillRoundedRect(px, py, pw, ph, 24);
    parts.panel.fillStyle(0xf1e7cd, 1);
    parts.panel.fillRoundedRect(px + 6, py + 6, pw - 12, ph - 12, 18);
    parts.panel.lineStyle(2, 0xd9c9a0, 1);
    parts.panel.strokeRoundedRect(px + 14, py + 14, pw - 28, ph - 28, 12);

    this.drawMapBase(h);
  }

  // ---------------------------------------------------------------- minimap

  private mapOrigin(h: number): { x: number; y: number } {
    return { x: 16, y: h - WORLD.h * this.mapScale - 18 };
  }

  /** Map world x → minimap pixel x (centred window, clamped to the box). */
  private mx(ox: number, wx: number): number {
    return ox + Phaser.Math.Clamp((wx - this.mapViewX0) * this.mapScale, 0, MAP_W);
  }

  /** Map world y → minimap pixel y (clamped to the box). */
  private my(oy: number, wy: number): number {
    return oy + Phaser.Math.Clamp(wy * this.mapScale, 0, WORLD.h * this.mapScale);
  }

  private drawMapBase(h: number): void {
    const o = this.mapOrigin(h);
    const s = this.mapScale;
    const g = this.mapBg;
    g.clear();
    g.fillStyle(0x1c1a17, 0.55);
    g.fillRoundedRect(o.x - 4, o.y - 4, MAP_W + 8, WORLD.h * s + 8, 6);
    g.lineStyle(2, 0xe8e0c8, 0.5);
    for (const r of ROADS) {
      g.lineBetween(this.mx(o.x, r.x1), this.my(o.y, r.y1), this.mx(o.x, r.x2), this.my(o.y, r.y2));
    }
    g.strokeCircle(this.mx(o.x, RING.cx), this.my(o.y, RING.cy), RING.r * s);
  }

  private drawMapDots(now: number): void {
    if (now < this.mapAt) return;
    this.mapAt = now + 140;
    const o = this.mapOrigin(this.scale.height);
    const s = this.mapScale;
    const g = this.mapDots;
    g.clear();
    // goal
    g.fillStyle(0x6fd06f, 1);
    g.fillCircle(this.mx(o.x, GOAL.x), this.my(o.y, GOAL.y), 4);
    // police
    g.fillStyle(0xff5a4a, 1);
    for (const cop of this.game_.police) {
      g.fillCircle(this.mx(o.x, cop.x), this.my(o.y, cop.y), 1.8);
    }
    // detention bus
    if (this.game_.bus) {
      g.fillStyle(0xffa040, 1);
      g.fillCircle(this.mx(o.x, this.game_.bus.sprite.x), this.my(o.y, this.game_.bus.sprite.y), 3);
    }
    // the roach
    g.fillStyle(0xffffff, 1);
    g.fillCircle(this.mx(o.x, this.game_.player.x), this.my(o.y, this.game_.player.y), 2.6);
  }

  // ------------------------------------------------------------------- loop

  update(): void {
    const gs = this.game_;
    if (!gs || !gs.player) return;
    const now = this.time.now;

    if (this.joy) this.joyVec.copy(this.joy.vec);

    // HUD numbers
    const meters = Math.max(0, Math.round(gs.distRemaining / 10));
    this.distLabel.setText(`🏛️ ${meters}m to go`);
    this.timeLabel.setText(`⏱ ${fmtTime(gs.elapsed)}`);

    // active effects
    const bits: string[] = [];
    const coffee = Math.ceil((gs.player.coffeeUntil - now) / 1000);
    const leaf = Math.ceil((gs.player.leafUntil - now) / 1000);
    if (coffee > 0) bits.push(`☕${coffee}`);
    if (leaf > 0) bits.push(`🍃${leaf}`);
    if (gs.player.umbrellas > 0) bits.push(`☂️x${gs.player.umbrellas}`);
    this.buffLabel.setText(bits.join('  '));

    // tear gas blur
    this.gasOverlay.setFillStyle(0xa8b478, gs.gasBlur * 0.42);

    // goal compass floats near screen centre pointing at Jantar Mantar
    const cam = gs.cameras.main;
    const dx = GOAL.x - gs.player.x;
    const dy = GOAL.y - gs.player.y;
    const a = Math.atan2(dy, dx);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const onScreen = cam.worldView.contains(GOAL.x, GOAL.y);
    this.compass.setVisible(!onScreen && !gs.won);
    this.compass.setPosition(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
    this.compass.setAlpha(0.55 + 0.3 * Math.sin(now / 300));

    this.drawMapDots(now);
  }
}
