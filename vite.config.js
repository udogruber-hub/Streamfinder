import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Streamfinder/',
  publicDir: '.',
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
})
