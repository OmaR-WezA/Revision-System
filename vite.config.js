import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Build output goes to 'dist' — compatible with Vercel, Netlify, Firebase Hosting, Surge
  build: {
    outDir: 'dist',
  }
})
