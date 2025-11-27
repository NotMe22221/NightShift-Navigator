import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'sdk/index.ts'),
        'sensor-fusion/index': resolve(__dirname, 'sdk/sensor-fusion/index.ts'),
        'computer-vision/index': resolve(__dirname, 'sdk/computer-vision/index.ts'),
        'pathfinding/index': resolve(__dirname, 'sdk/pathfinding/index.ts'),
        'ar-overlay/index': resolve(__dirname, 'sdk/ar-overlay/index.ts'),
        'audio/index': resolve(__dirname, 'sdk/audio/index.ts'),
        'energy/index': resolve(__dirname, 'sdk/energy/index.ts'),
        'plugin-api/index': resolve(__dirname, 'sdk/plugin-api/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['three', 'rxjs', '@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-webgl'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './sdk'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
