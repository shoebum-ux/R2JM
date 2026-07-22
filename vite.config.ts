import { defineConfig } from 'vite';

// base './' so the build works on GitHub Pages / any static host subpath.
export default defineConfig({
  base: './',
  build: {
    target: 'es2018',
    chunkSizeWarningLimit: 2000
  },
  server: {
    port: 5173,
    host: true
  }
});
