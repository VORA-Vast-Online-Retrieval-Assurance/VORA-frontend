import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The VORA backend (vora/Backend, FastAPI) has no CORS, and we don't change it. In dev, the app calls
// same-origin /api and /health, and Vite forwards them. Point VORA_API elsewhere to use another backend.
const backend = process.env.VORA_API ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Libraries change less often than our code: separate chunks stay cached across deploys.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[/](react|react-dom|react-router|scheduler)[/]/ },
            { name: 'motion', test: /node_modules[/](motion|motion-dom|motion-utils|framer-motion|lenis)[/]/ },
            { name: 'supabase', test: /node_modules[/]@supabase[/]/ },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true, ws: true },
      '/health': { target: backend, changeOrigin: true },
    },
  },
})
