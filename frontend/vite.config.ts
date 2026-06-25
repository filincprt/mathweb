import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MathWeb',
        short_name: 'MathWeb',
        description: 'Играй и учи таблицу умножения и деления',
        theme_color: '#7C3AED',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/pwa.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000'
    }
  }
})
