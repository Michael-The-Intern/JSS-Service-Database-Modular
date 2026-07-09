import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/JSS-Service-Database-Modular/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
