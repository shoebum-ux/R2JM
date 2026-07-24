/** Shared flat-UI widgets (cream dialog panels + rounded buttons). */

import Phaser from 'phaser';
import { CLEAR_FONT } from '../config';

const PIXEL_FONT = '"Arial Black", "Impact", ' + CLEAR_FONT;

export interface PixelPalette { face: number; hi: number; lo: number; edge: number; }
export const PX_GREEN: PixelPalette = { face: 0x7cbf3f, hi: 0x9fd85f, lo: 0x4f8a24, edge: 0x2b3d16 };
export const PX_BLUE: PixelPalette = { face: 0x3f8fd0, hi: 0x62b0e8, lo: 0x25628f, edge: 0x16283d };
export const PX_GREY: PixelPalette = { face: 0x6b6b6b, hi: 0x8a8a8a, lo: 0x454545, edge: 0x232323 };

/** Draw a chunky pixel-art button body (blocky bevel) into a graphics object. */
function pixelBody(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, p: PixelPalette): void {
  const b = 4; // pixel border thickness
  g.fillStyle(p.edge, 1);
  g.fillRect(x, y, w, h);                                  // dark outline
  g.fillStyle(p.lo, 1);
  g.fillRect(x + b, y + b, w - b * 2, h - b * 2);          // shadow base
  g.fillStyle(p.face, 1);
  g.fillRect(x + b, y + b, w - b * 2, h - b * 3);          // face
  g.fillStyle(p.hi, 1);
  g.fillRect(x + b, y + b, w - b * 2, b);                  // top highlight
  g.fillStyle(p.edge, 0.35);
  g.fillRect(x + b, y + h - b * 2, w - b * 2, b);          // inner shade line
}

/**
 * A chunky pixel-art button with a label and optional trailing emoji icon.
 * `w`/`h` are the full button size; positioned by centre (x, y).
 */
export function pixelButton(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  label: string, icon: string, pal: PixelPalette, onClick: () => void, depth = 9
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  pixelBody(g, -w / 2, -h / 2, w, h, pal);

  const txt = scene.add.text(icon ? -8 : 0, -2, label, {
    fontFamily: PIXEL_FONT, fontSize: `${Math.floor(h * 0.42)}px`, color: '#f7f3e8', fontStyle: 'bold'
  }).setOrigin(0.5);
  txt.setShadow(2, 2, 'rgba(0,0,0,0.45)', 0);
  const parts: Phaser.GameObjects.GameObject[] = [g, txt];
  if (icon) {
    const ic = scene.add.text(w / 2 - 26, -1, icon, { fontSize: `${Math.floor(h * 0.5)}px` }).setOrigin(0.5);
    parts.push(ic);
  }
  // Full-size transparent hit target: a Graphics child reports no bounds, which
  // shrank the container's clickable region to just the text. A Rectangle has
  // exact bounds, so the whole button is clickable.
  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  parts.push(hit);

  const btn = scene.add.container(x, y, parts).setDepth(depth);
  scene.tweens.add({ targets: btn, scale: 1.03, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  // Feedback via alpha only — never move the button, or the cursor ends up off
  // it and the pointerup click is lost.
  hit.on('pointerover', () => btn.setAlpha(0.9));
  hit.on('pointerout', () => btn.setAlpha(1));
  hit.on('pointerup', () => { btn.setAlpha(1); onClick(); });
  return btn;
}

/**
 * A small square pixel icon button whose look/emoji reflects a boolean state.
 * `render(on)` returns the emoji + palette to draw. Returns a toggle() helper.
 */
export function pixelToggle(
  scene: Phaser.Scene, x: number, y: number, size: number,
  initialOn: boolean, render: (on: boolean) => { emoji: string; pal: PixelPalette }, onClick: () => void, depth = 601
): { container: Phaser.GameObjects.Container; refresh: (on: boolean) => void } {
  const g = scene.add.graphics();
  const label = scene.add.text(0, -1, '', { fontSize: `${Math.floor(size * 0.5)}px` }).setOrigin(0.5);
  const draw = (on: boolean): void => {
    const { emoji, pal } = render(on);
    g.clear();
    pixelBody(g, -size / 2, -size / 2, size, size, pal);
    label.setText(emoji);
  };
  draw(initialOn);

  const hit = scene.add.rectangle(0, 0, size, size, 0x000000, 0).setInteractive({ useHandCursor: true });
  const btn = scene.add.container(x, y, [g, label, hit]).setDepth(depth);
  hit.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    onClick();
  });
  return { container: btn, refresh: draw };
}

/** A cream rounded dialog panel centred on (cx, cy). */
export function dialogPanel(
  scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, depth = 700
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  const x = cx - w / 2, y = cy - h / 2;
  g.fillStyle(0x1c1a17, 0.3);
  g.fillRoundedRect(x + 5, y + 10, w, h, 26);      // drop shadow
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(x, y, w, h, 26);               // white border
  g.fillStyle(0xf1e7cd, 1);
  g.fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 20); // cream fill
  g.lineStyle(2, 0xd9c9a0, 1);
  g.strokeRoundedRect(x + 14, y + 14, w - 28, h - 28, 14);
  return g;
}

export interface BtnPalette { face: number; top: number; bottom: number; }
export const BTN_ORANGE: BtnPalette = { face: 0xef8b3c, top: 0xffb15e, bottom: 0xd06f28 };
export const BTN_GREEN: BtnPalette = { face: 0x64b64a, top: 0x86d06a, bottom: 0x458a34 };

/** A chunky rounded button with a white ring, 3-tone bevel and pointer feel. */
export function roundButton(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  label: string, pal: BtnPalette, onClick: () => void, depth = 702
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const r = h / 2;
  g.fillStyle(0x1c1a17, 0.22);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, r + 5);
  g.fillStyle(pal.bottom, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(pal.face, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - 8, r);
  g.fillStyle(pal.top, 0.9);
  g.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, 12, 8);

  const txt = scene.add.text(0, -2, label, {
    fontFamily: CLEAR_FONT, fontSize: '25px', color: '#ffffff', fontStyle: 'bold'
  }).setOrigin(0.5);
  txt.setShadow(0, 2, 'rgba(80,50,20,0.5)', 0);

  const btn = scene.add.container(x, y, [g, txt]).setDepth(depth).setSize(w + 10, h + 10);
  btn.setInteractive(new Phaser.Geom.Rectangle(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10), Phaser.Geom.Rectangle.Contains);
  if (btn.input) btn.input.cursor = 'pointer';
  scene.tweens.add({ targets: btn, scale: 1.04, duration: 640, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  btn.on('pointerover', () => btn.setY(y - 2));
  btn.on('pointerout', () => btn.setY(y));
  btn.on('pointerdown', () => btn.setY(y + 3));
  btn.on('pointerup', () => { btn.setY(y); onClick(); });
  return btn;
}
