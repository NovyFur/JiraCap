import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // vital for GitHub Pages: makes asset links relative (e.g. "./script.js" instead of "/script.js")
    base: './', 
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});