import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/ml-api': {
        target: 'https://api.mercadolibre.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ml-api/, ''),
        secure: true
      },
      '/ml-auth': {
        target: 'https://auth.mercadolivre.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ml-auth/, ''),
        secure: true
      }
    }
  }
})
