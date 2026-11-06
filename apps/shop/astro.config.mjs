import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/postcss'
import { fileURLToPath } from 'node:url'

const shared = fileURLToPath(new URL('../../src', import.meta.url))

export default defineConfig({
  site: 'https://shop.cube-designers.com',
  adapter: process.env.SHOP_RUNTIME === 'node' ? node({ mode: 'standalone' }) : vercel(),
  integrations: [react()],
  // Both projects publish the shared media, so admin previews keep working.
  publicDir: '../../public',
  vite: {
    css: { postcss: { plugins: [tailwindcss()] } },
    define: { 'import.meta.env.VITE_APP_TARGET': JSON.stringify('shop') },
    resolve: { alias: { '@': shared }, dedupe: ['react', 'react-dom'] },
    server: { fs: { allow: ['../..'] } },
  },
})
