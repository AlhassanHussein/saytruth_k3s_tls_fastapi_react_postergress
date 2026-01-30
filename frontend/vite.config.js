import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    middlewareMode: false,
    allowedHosts: ['localhost', '127.0.0.1', 'saytruth.duckdns.org'],
    watch: {
      usePolling: true,
    },
    // For development, allow connections from any origin
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'http',
    },
  },
})
