import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Optimize caching strategy
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:youtube|googleapis|ytimg)\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'youtube-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60 // 1 day
              }
            }
          }
        ]
      },
      manifest: {
        name: 'StreamVibe - Music Streaming',
        short_name: 'StreamVibe',
        description: 'Real-time collaborative music streaming with DJ controls and song requests',
        theme_color: '#3b82f6',
        background_color: '#0b0e14',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['music', 'entertainment'],
        shortcuts: [
          {
            name: 'Create Room',
            short_name: 'New Room',
            description: 'Create a new music streaming room',
            url: '/?action=create',
            icons: [{
              src: 'pwa-192x192.png',
              sizes: '192x192'
            }]
          },
          {
            name: 'Join Room',
            short_name: 'Join',
            description: 'Join an existing music room',
            url: '/?action=join',
            icons: [{
              src: 'pwa-192x192.png',
              sizes: '192x192'
            }]
          }
        ]
      }
    })
  ],
})
