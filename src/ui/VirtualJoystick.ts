/**
 * Floating touch joystick: appears wherever the player touches, vanishes on
 * release. Lives in the UI scene (screen space).
 */

import Phaser from 'phaser';

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Image;
  private stick: Phaser.GameObjects.Image;
  private pointerId = -1;
  private origin = new Phaser.Math.Vector2();
  /** Normalized output vector, length 0..1. */
  readonly vec = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.base = scene.add.image(0, 0, 'joy_base').setDepth(1000).setVisible(false).setScrollFactor(0);
    this.stick = scene.add.image(0, 0, 'joy_stick').setDepth(1001).setVisible(false).setScrollFactor(0);

    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    // Ignore touches that begin on UI buttons.
    if (this.pointerId !== -1 || over.length > 0) return;
    this.pointerId = p.id;
    this.origin.set(p.x, p.y);
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.stick.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    const dx = p.x - this.origin.x;
    const dy = p.y - this.origin.y;
    const len = Math.hypot(dx, dy);
    const max = 44;
    const clamped = Math.min(len, max);
    if (len > 4) {
      this.vec.set((dx / len) * (clamped / max), (dy / len) * (clamped / max));
    } else {
      this.vec.set(0, 0);
    }
    this.stick.setPosition(
      this.origin.x + (len ? (dx / len) * clamped : 0),
      this.origin.y + (len ? (dy / len) * clamped : 0)
    );
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = -1;
    this.vec.set(0, 0);
    this.base.setVisible(false);
    this.stick.setVisible(false);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
  }
}
