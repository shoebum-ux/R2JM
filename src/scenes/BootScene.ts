/** Generates every texture (the whole art pipeline runs here), then → Menu. */

import Phaser from 'phaser';
import { buildTextures, signTexture } from '../assets/TextureFactory';
import { SIGNS } from '../maps/DelhiMap';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    buildTextures(this);
    SIGNS.forEach((s, i) => signTexture(this, `sign_${i}`, s.text));
    this.scene.start('Menu');
  }
}
