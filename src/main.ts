/** Entry point: Phaser boot + PWA service worker registration. */

import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import UIScene from './scenes/UIScene';
import GameOverScene from './scenes/GameOverScene';
import VictoryScene from './scenes/VictoryScene';
import { Audio } from './audio/AudioManager';

/**
 * Construct the game only once the parent element has a real layout size.
 * (In background/prerendered tabs the parent can measure 0×0, which would
 * boot the WebGL renderer with a zero-size framebuffer and break it.)
 */
function whenParentSized(cb: () => void): void {
  const el = document.getElementById('app');
  const r = el?.getBoundingClientRect();
  if (r && r.width > 1 && r.height > 1) {
    cb();
  } else {
    setTimeout(() => whenParentSized(cb), 120);
  }
}

whenParentSized(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    // sky blue so the boot flash matches the menu (not a black canvas)
    backgroundColor: '#5aa9dc',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight
    },
    render: {
      antialias: true,
      roundPixels: false,
      // Keep the WebGL backbuffer so screen-recording / capture (and some
      // browser compositors) show the render instead of a black frame.
      preserveDrawingBuffer: true
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, VictoryScene]
  });

  // handy for debugging from the console
  (window as unknown as { game: Phaser.Game }).game = game;
  (window as unknown as { audio: typeof Audio }).audio = Audio;

  // The RESIZE scale manager can measure the parent before layout settles —
  // nudge it once the page is fully laid out.
  game.events.once('ready', () => game.scale.refresh());
  window.addEventListener('load', () => game.scale.refresh());

  // RESIZE mode only watches the window, so it misses #app resizing when the
  // in-game header is shown/hidden — leaving the canvas smaller than #app.
  // A ResizeObserver on #app keeps the canvas exactly matched (no loop: the
  // canvas is a flex child, so resizing it doesn't change #app's size).
  const appEl = document.getElementById('app');
  if (appEl && 'ResizeObserver' in window) {
    new ResizeObserver(() => { if (game.isRunning) game.scale.refresh(); }).observe(appEl);
  }

  // Fallback: in throttled/background tabs the texture-ready boot chain can
  // stall; if the game hasn't started shortly after load, kick it ourselves.
  // Emitting the textures 'ready' event runs the normal chain (renderer
  // pipelines boot first, then the game) and is a no-op if it already fired.
  const kick = (): void => {
    if (!game.isRunning) {
      game.scale.refresh();
      game.textures.emit('ready');
      setTimeout(kick, 1000);
    }
  };
  setTimeout(kick, 1500);
});

// PWA: offline support in production builds only
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', window.location.href).pathname).catch(() => {
      /* offline support is a nice-to-have */
    });
  });
}
