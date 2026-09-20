import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,   // fail fast if 5174 is taken
  },
  preview: {
    port: 5174,
  },
});
