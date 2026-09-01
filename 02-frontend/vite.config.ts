import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  build:{
    sourcemap:false,
    cssCodeSplit:true,
    chunkSizeWarningLimit:600,
    rollupOptions:{
      output:{
        manualChunks(id){
          if(id.includes("node_modules")){
            if(id.includes("lucide-react")) return "icons";
            if(
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) return "vendor";
          }
        }
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Same-origin API access: the browser only talks to the Vite origin,
      // which forwards /api to the FastAPI backend. Works locally, on Replit,
      // and behind reverse proxies without CORS or hardcoded backend URLs.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});


