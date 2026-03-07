import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for LAN access
    port: Number(process.env.PORT) || 5173,
    // Allow Vite to fall back to a different port if 5173 is in use
    // (when strictPort is false Vite will try the next available port)
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  }
})
