import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    fs: { allow: [searchForWorkspaceRoot(root), path.resolve(root, '../privatepoker-p2p')] },
  },
  resolve: {
    alias: { '@': path.resolve(root, './src') },
  },
});
