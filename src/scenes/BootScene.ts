/** Generates every texture (the whole art pipeline runs here), then → Menu. */

import Phaser from 'phaser';
import { buildTextures, signTexture } from '../assets/TextureFactory';
import { SIGNS } from '../maps/DelhiMap';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Optional hand-made menu poster: drop the artwork at public/menu-bg.png
    // and it becomes the menu background. Missing file is fine (forest fallback).
    this.load.image('menu_bg', `${import.meta.env.BASE_URL}menu-bg.png`);
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (file.key === 'menu_bg') { /* no poster provided — use the forest menu */ }
    });
  }

  create(): void {
    buildTextures(this);
    SIGNS.forEach((s, i) => signTexture(this, `sign_${i}`, s.text));
    this.scene.start('Menu');
  }
}
