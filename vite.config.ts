import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/canton': {
        target: 'http://127.0.0.1:7575',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/canton/, ''),
      },
      '/api/canton-wallet': {
        target: 'http://127.0.0.1:3030',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/canton-wallet/, '/api/v0/dapp'),
      },
      '/api/zenith-gateway': {
        target: 'https://gateway.testnet.zenith.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zenith-gateway/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Canton setup is lazy-loaded and includes the official CIP-103 wallet SDK.
    chunkSizeWarningLimit: 900,
  },
})
