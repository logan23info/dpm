import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the domain root on Vercel.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist' }
})
