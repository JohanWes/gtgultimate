import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_HOST || 'localhost',
    port: Number.parseInt(process.env.VITE_PORT || '5173', 10),
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
})
