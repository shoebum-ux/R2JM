/** Shared flat-UI widgets (cream dialog panels + rounded buttons). */

import Phaser from 'phaser';
import { CLEAR_FONT } from '../config';

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
