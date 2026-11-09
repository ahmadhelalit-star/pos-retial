import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: process.env.RETAIL_VITE_CACHE || 'node_modules/.vite',
  server: {
    host: '127.0.0.1', port: 5188, strictPort: true,
    fs: {
      allow: ['..'],
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.developer/**'],
    },
    proxy: { '/api': { target: process.env.RETAIL_API_TARGET || 'http://127.0.0.1:37941', changeOrigin: false } },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
