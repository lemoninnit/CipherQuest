import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy `/api` to backend during development to avoid CORS and 404s
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // rewrite: path => path.replace(/^\/api/, '') // backend expects /api prefix
      }
    }
  }
})
