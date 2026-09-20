import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'brading',
  server: {
    proxy: {
      // En dev, /api/analizar lo sirve scripts/serve-ia.mjs (http://localhost:8787).
      // En producción lo sirve Vercel.
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    allowedHosts: true,
  },
})