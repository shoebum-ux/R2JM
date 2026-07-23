/**
 * UIScene — screen-space overlay: one-life heart, distance, buttons,
 * minimap, virtual joystick, gas blur, goal compass, pause.
 */

import Phaser from 'phaser';
import type GameScene from './GameScene';
import { ROADS, RING, GOAL, BUILDINGS } from '../maps/DelhiMap';
import { FONT, CLEAR_FONT } from '../config';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { Audio } from '../audio/AudioManager';
import { fmtTime } from '../systems/Save';
import { pixelToggle, PX_BLUE, PX_GREY } from '../ui/Widgets';

// Circular GTA-style radar, centred on the roach.
const RADAR_R = 56;         // radius in pixels
const RADAR_WORLD_R = 1250; // world units shown from centre to edge

export default class UIScene extends Phaser.Scene {
  joyVec = new Phaser.Math.Vector2();

  private game_!: GameScene;
  private joy: VirtualJoystick | null = null;
  private heart!: Phaser.GameObjects.Image;
  private lifeLabel!: Phaser.GameObjects.Text;
  private distLabel!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;
  private buffLabel!: Phaser.GameObjects.Text;
  private radarContent!: Phaser.GameObjects.Graphics;
  private radarTop!: Phaser.GameObjects.Graphics;
  private radarMaskG!: Phaser.GameObjects.Graphics;
  private compassN!: Phaser.GameObjects.Text;
  private compassS!: Phaser.GameObjects.Text;
  private radarCx = 0;
  private radarCy = 0;
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

    // circular radar (content is clipped to a circle mask)
    this.radarContent = this.add.graphics().setDepth(590);
    this.radarTop = this.add.graphics().setDepth(592);
    this.radarMaskG = this.make.graphics({});
    this.radarContent.setMask(this.radarMaskG.createGeometryMask());
    const compassStyle = { fontFamily: CLEAR_FONT, fontSize: '11px', fontStyle: 'bold' };
    this.compassN = this.add.text(0, 0, 'N', { ...compassStyle, color: '#ffffff' })
      .setOrigin(0.5).setDepth(593).setShadow(0, 1, 'rgba(0,0,0,0.8)', 0);
    this.compassS = this.add.text(0, 0, 'S', { ...compassStyle, color: '#ff6a5a' })
      .setOrigin(0.5).setDepth(593).setShadow(0, 1, 'rgba(0,0,0,0.8)', 0);

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

    this.layoutRadar(w, h);
  }

  // ------------------------------------------------------------------- radar

  /** Position the circular radar (bottom-left) and update its clip mask. */
  private layoutRadar(_w: number, h: number): void {
    this.radarCx = RADAR_R + 18;
    this.radarCy = h - RADAR_R - 16;
    this.radarMaskG.clear();
    this.radarMaskG.fillStyle(0xffffff, 1);
    this.radarMaskG.fillCircle(this.radarCx, this.radarCy, RADAR_R);
    this.compassN.setPosition(this.radarCx, this.radarCy - RADAR_R + 9);
    this.compassS.setPosition(this.radarCx, this.radarCy + RADAR_R - 9);
  }

  /** GTA-style radar: world scrolls under a fixed roach arrow at the centre. */
  private drawRadar(): void {
    const gs = this.game_;
    const cx = this.radarCx, cy = this.radarCy, R = RADAR_R;
    const s = R / RADAR_WORLD_R;
    const px = gs.player.x, py = gs.player.y;
    const g = this.radarContent;
    g.clear();

    // ground + buildings + roads (clipped to the circle by the mask)
    g.fillStyle(0x9ec47e, 1);
    g.fillCircle(cx, cy, R);
    g.fillStyle(0xc2a878, 1);
    for (const b of BUILDINGS) {
      if (Math.abs(b.x + b.w / 2 - px) > RADAR_WORLD_R + 320) continue;
      if (Math.abs(b.y + b.h / 2 - py) > RADAR_WORLD_R + 320) continue;
      g.fillRect(cx + (b.x - px) * s, cy + (b.y - py) * s, b.w * s, b.h * s);
    }
    g.lineStyle(3, 0xefe7d0, 0.95);
    for (const r of ROADS) {
      g.lineBetween(cx + (r.x1 - px) * s, cy + (r.y1 - py) * s, cx + (r.x2 - px) * s, cy + (r.y2 - py) * s);
    }
    g.strokeCircle(cx + (RING.cx - px) * s, cy + (RING.cy - py) * s, RING.r * s);

    // police + detention bus
    g.fillStyle(0xff5a4a, 1);
    for (const cop of gs.police) {
      const dx = cop.x - px, dy = cop.y - py;
      if (Math.hypot(dx, dy) * s < R - 3) g.fillCircle(cx + dx * s, cy + dy * s, 2);
    }
    if (gs.bus) {
      const dx = gs.bus.sprite.x - px, dy = gs.bus.sprite.y - py;
      if (Math.hypot(dx, dy) * s < R - 3) {
        g.fillStyle(0xffa040, 1);
        g.fillCircle(cx + dx * s, cy + dy * s, 2.6);
      }
    }

    // goal marker: a red diamond, clamped to the rim when out of range
    const gdx = GOAL.x - px, gdy = GOAL.y - py;
    const gdist = Math.hypot(gdx, gdy);
    let mx = cx + gdx * s, my = cy + gdy * s;
    if (gdist * s > R - 7) {
      const a = Math.atan2(gdy, gdx);
      mx = cx + Math.cos(a) * (R - 8);
      my = cy + Math.sin(a) * (R - 8);
    }
    this.diamond(g, mx, my, 6, 0xffffff);
    this.diamond(g, mx, my, 4, 0xe0332a);

    // border ring + roach arrow (unclipped, on top)
    const t = this.radarTop;
    t.clear();
    t.lineStyle(4, 0x2a241c, 1);
    t.strokeCircle(cx, cy, R);
    const dir = gs.player.sprite.rotation - Math.PI / 2;
    const ax = Math.cos(dir), ay = Math.sin(dir), nx = -ay, ny = ax;
    t.fillStyle(0xffffff, 1);
    t.beginPath();
    t.moveTo(cx + ax * 8, cy + ay * 8);
    t.lineTo(cx - ax * 5 + nx * 5, cy - ay * 5 + ny * 5);
    t.lineTo(cx - ax * 5 - nx * 5, cy - ay * 5 - ny * 5);
    t.closePath();
    t.fillPath();
    t.lineStyle(1.5, 0x2a241c, 1);
    t.strokePath();
  }

  private diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x, y - r);
    g.lineTo(x + r, y);
    g.lineTo(x, y + r);
    g.lineTo(x - r, y);
    g.closePath();
    g.fillPath();
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

    this.drawRadar();
  }
}
