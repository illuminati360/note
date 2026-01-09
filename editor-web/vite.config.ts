import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single input config - we'll run builds separately for each HTML
export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2015',
  },
  plugins: [viteSingleFile()],
});
