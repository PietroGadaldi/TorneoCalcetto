import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Torneo Calcetto',
        short_name: 'Torneo Calcetto',
        description:
          "Gestione centralizzata di un torneo di calcio a 3 con 6 squadre: iscrizioni, ruoli, girone, play-off e classifica in tempo reale.",
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        background_color: '#002db5',
        theme_color: '#002db5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Service worker senza cache: serve solo a rendere l'app installabile.
      // Niente precache della build né cache a runtime — ogni richiesta va in
      // rete, così non capita mai di girare su un bundle vecchio (e i dati
      // Supabase restano sempre freschi).
      workbox: {
        globPatterns: [],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: () => true,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
