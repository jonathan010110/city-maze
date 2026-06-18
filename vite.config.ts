import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serviert das Projekt unter https://<user>.github.io/city-maze/
  // — Assets müssen daher relativ zu diesem Unterpfad aufgelöst werden.
  base: '/city-maze/',
  build: {
    // Three.js ist als einzelne Vendor-Lib ~500 kB groß (gzip ~127 kB) und
    // wird in einen eigenen Chunk ausgelagert. Limit entsprechend angehoben.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
})
