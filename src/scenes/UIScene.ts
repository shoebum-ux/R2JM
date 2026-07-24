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
import { pixelToggle, PX_BLUE, PX_GREY } from '../ui/Widgets';

// Full-map minimap (rounded rect, GTA-green theme), bottom-left.
const MAP_PX_W = 90; // minimap pixel width; height follows the world aspect

export default class UIScene extends Phaser.Scene {
  joyVec = new Phaser.Math.Vector2();

  private game_!: GameScene;
  private joy: VirtualJoystick | null = null;
  private heart!: Phaser.GameObjects.Image;
  private lifeLabel!: Phaser.GameObjects.Text;
  private distLabel!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;
  private buffLabel!: Phaser.GameObjects.Text;
  private mapBase!: Phaser.GameObjects.Graphics;  // static ground + roads
  private mapDots!: Phaser.GameObjects.Graphics;  // moving player/police/goal
  private mapX = 0;
  private mapY = 0;
  private mapScale = 1;
  private mapH = 0;
  // Horizontal window left edge so the Connaught Place ring sits centred.
  private mapViewX0 = RING.cx - WORLD.w / 2;
  private gasOverlay!: Phaser.GameObjects.Rectangle;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private compass!: Phaser.GameObjects.Text;
  private musicToggle!: { container: Phaser.GameObjects.Container; refresh: (on: boolean) => void };

  constructor() {
    super('UI');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.joyVec.set(0, 0);

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

    // full-map minimap (whole world visible)
    this.mapBase = this.add.graphics().setDepth(590);
    this.mapDots = this.add.graphics().setDepth(591);

    this.compass = this.add.text(0, 0, '🏛️', { fontSize: '20px' }).setOrigin(0.5).setDepth(600).setAlpha(0.85);

    this.makeButtons();
    this.makePauseOverlay();

    if ('ontouchstart' in window) {
      this.joy = new VirtualJoystick(this);
    }

    // keyboard shortcuts (buttons removed from the HUD except music)
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => this.toggleMusic());
    this.input.keyboard?.on('keydown-R', () => this.restartRun());

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.joy?.destroy();
    });
  }

  // ---------------------------------------------------------------- buttons

  /** Only a music on/off toggle remains on the HUD (bottom-right). */
  private makeButtons(): void {
    this.musicToggle = pixelToggle(
      this, 0, 0, 46, !Audio.musicMuted,
      (on) => (on ? { emoji: '🎵', pal: PX_BLUE } : { emoji: '🔇', pal: PX_GREY }),
      () => this.toggleMusic()
    );
  }

  private toggleMusic(): void {
    const muted = Audio.toggleMusic();
    this.musicToggle.refresh(!muted);
  }

  private togglePause(): void {
    if (this.game_.over) return;
    const parts = this.pauseOverlay.getData('parts') as { dim: Phaser.GameObjects.Rectangle };
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      this.pauseOverlay.setVisible(false);
      parts.dim.disableInteractive();
      Audio.startGameMusic();
    } else {
      this.scene.pause('Game');
      this.pauseOverlay.setVisible(true);
      parts.dim.setInteractive();
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
    dim.on('pointerdown', () => this.togglePause()); // tap overlay to resume
    const panel = this.add.graphics();
    const label = this.add.text(0, 0, '⏸  PAUSED\n\nthe roach waits…\ntap anywhere or press P to resume', {
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

    // music toggle bottom-right (inset to clear the frame's rounded corner)
    this.musicToggle.container.setPosition(w - 40, h - 44);

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

    this.layoutMap(w, h);
  }

  // ----------------------------------------------------------------- minimap

  /** Place the full-map minimap (bottom-left) and draw its static base. */
  private layoutMap(_w: number, h: number): void {
    this.mapScale = MAP_PX_W / WORLD.w;
    this.mapH = WORLD.h * this.mapScale;
    this.mapX = 16;
    this.mapY = h - this.mapH - 16;
    this.drawMapBase();
  }

  /** World x → minimap pixel x (ring-centred window, clamped to the box). */
  private mx(wx: number): number {
    return this.mapX + Phaser.Math.Clamp((wx - this.mapViewX0) * this.mapScale, 0, MAP_PX_W);
  }

  /** World y → minimap pixel y (clamped to the box). */
  private my(wy: number): number {
    return this.mapY + Phaser.Math.Clamp(wy * this.mapScale, 0, this.mapH);
  }

  /** Ground + roads + immunity zone — static, redrawn only on layout. */
  private drawMapBase(): void {
    const g = this.mapBase;
    const x = this.mapX, y = this.mapY, w = MAP_PX_W, mh = this.mapH, s = this.mapScale;
    g.clear();
    g.fillStyle(0x2a241c, 0.9);
    g.fillRoundedRect(x - 3, y - 3, w + 6, mh + 6, 7);   // dark border
    g.fillStyle(0x9ec47e, 1);
    g.fillRoundedRect(x, y, w, mh, 4);                    // green ground
    g.lineStyle(1.6, 0xefe7d0, 0.9);
    for (const r of ROADS) {
      g.lineBetween(this.mx(r.x1), this.my(r.y1), this.mx(r.x2), this.my(r.y2));
    }
    g.strokeCircle(this.mx(RING.cx), this.my(RING.cy), RING.r * s);

    // Immunity zone (Jantar Mantar) — green circle
    const igr = Math.max(4, GOAL.r * s);
    g.fillStyle(0x4fd06f, 0.4);
    g.fillCircle(this.mx(GOAL.x), this.my(GOAL.y), igr);
    g.lineStyle(1.6, 0x2f8a3a, 1);
    g.strokeCircle(this.mx(GOAL.x), this.my(GOAL.y), igr);
  }

  /** Moving markers — whole map visible, player/police as dots. */
  private drawMapDots(): void {
    const gs = this.game_;
    const g = this.mapDots;
    g.clear();

    // police + detention bus
    g.fillStyle(0xff5a4a, 1);
    for (const cop of gs.police) g.fillCircle(this.mx(cop.x), this.my(cop.y), 1.6);
    if (gs.bus) {
      g.fillStyle(0xffa040, 1);
      g.fillCircle(this.mx(gs.bus.sprite.x), this.my(gs.bus.sprite.y), 2.2);
    }

    // the roach
    const rx = this.mx(gs.player.x), ry = this.my(gs.player.y);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(rx, ry, 2.6);
    g.lineStyle(1, 0x2a241c, 1);
    g.strokeCircle(rx, ry, 2.6);
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

    this.drawMapDots();
  }
}
