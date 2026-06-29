import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  base: '/rezeptor/',
  plugins: [
    basicSsl(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Neuer Service Worker übernimmt sofort, statt auf App-Schließen zu warten
        clientsClaim: true,
        skipWaiting: true,
        // Alte Caches aus früheren Versionen aufräumen
        cleanupOutdatedCaches: true,
        // Eigene push-/notificationclick-Handler in den generierten SW laden
        importScripts: ['push-sw.js'],
      },
      manifest: {
        name: 'Rezeptor',
        short_name: 'Rezeptor',
        description: 'Deine persönliche Rezeptdatenbank',
        theme_color: '#3A5230',
        background_color: '#F9FBF8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/rezeptor/',
        start_url: '/rezeptor/',
        lang: 'de',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        share_target: {
          action: '/rezeptor/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      }
    })
  ],
  server: {
    https: true,
    host: true,
  }
})