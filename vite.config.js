import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1600,
  },
  esbuild: {
    supported: {
      'top-level-await': true
    }
  },
  plugins: [glsl()]
});


