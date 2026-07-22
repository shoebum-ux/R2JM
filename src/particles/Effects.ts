/** One-shot juice: floating emojis, confetti, fireworks, flashes, splashes. */

import Phaser from 'phaser';

const CONFETTI_COLORS = [0xe04338, 0xe8b93c, 0x6fa84e, 0x5a7ea3, 0x7e5aa3, 0xe8963c];

export function floatEmoji(scene: Phaser.Scene, x: number, y: number, char: string, size = 22): void {
  const t = scene.add.text(x, y, char, { fontSize: `${size}px` }).setOrigin(0.5).setDepth(900);
  scene.tweens.add({
    targets: t,
    y: y - 46,
    alpha: 0,
    scale: 1.25,
    duration: 950,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy()
  });
}

export function confettiBurst(scene: Phaser.Scene, x: number, y: number, count = 40): void {
  const em = scene.add.particles(x, y, 'confetti', {
    speed: { min: 90, max: 260 },
    angle: { min: 0, max: 360 },
    gravityY: 220,
    lifespan: { min: 700, max: 1400 },
    scale: { start: 1, end: 0.4 },
    rotate: { min: 0, max: 720 },
    tint: CONFETTI_COLORS,
    emitting: false
  }).setDepth(950);
  em.explode(count);
  scene.time.delayedCall(1600, () => em.destroy());
}

export function firework(scene: Phaser.Scene, x: number, y: number): void {
  const tint = Phaser.Utils.Array.GetRandom(CONFETTI_COLORS);
  const em = scene.add.particles(x, y, 'spark', {
    speed: { min: 60, max: 240 },
    angle: { min: 0, max: 360 },
    lifespan: { min: 500, max: 900 },
    scale: { start: 1.4, end: 0 },
    tint,
    emitting: false
  }).setDepth(950);
  em.explode(46);
  scene.time.delayedCall(1000, () => em.destroy());
}

export function splash(scene: Phaser.Scene, x: number, y: number): void {
  const em = scene.add.particles(x, y, 'drop', {
    speed: { min: 40, max: 160 },
    angle: { min: 0, max: 360 },
    lifespan: 400,
    scale: { start: 1, end: 0.2 },
    emitting: false
  }).setDepth(800);
  em.explode(14);
  scene.time.delayedCall(500, () => em.destroy());
}

export function puffSmoke(scene: Phaser.Scene, x: number, y: number, count = 6): void {
  const em = scene.add.particles(x, y, 'smoke', {
    speed: { min: 10, max: 50 },
    angle: { min: 0, max: 360 },
    lifespan: 800,
    scale: { start: 0.6, end: 1.6 },
    alpha: { start: 0.7, end: 0 },
    emitting: false
  }).setDepth(800);
  em.explode(count);
  scene.time.delayedCall(900, () => em.destroy());
}

/** White full-screen flash on the given camera. */
export function screenFlash(scene: Phaser.Scene, duration = 120, r = 255, g = 255, b = 255): void {
  scene.cameras.main.flash(duration, r, g, b);
}

/** Dust trail emitter that follows the player; caller keeps the reference. */
export function makeDustTrail(scene: Phaser.Scene, follow: Phaser.GameObjects.Components.Transform): Phaser.GameObjects.Particles.ParticleEmitter {
  const em = scene.add.particles(0, 0, 'dust', {
    speed: { min: 4, max: 18 },
    lifespan: 450,
    scale: { start: 0.6, end: 1.1 },
    alpha: { start: 0.5, end: 0 },
    frequency: 90,
    follow
  });
  em.setDepth(4);
  return em;
}
