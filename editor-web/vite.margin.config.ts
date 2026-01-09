import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

// Config for building the margin editor HTML
export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2015',
    rollupOptions: {
      input: resolve(__dirname, 'margin.html'),
    },
    // Don't empty the dist folder (main build already created index.html there)
    emptyOutDir: false,
  },
  plugins: [viteSingleFile()],
});
