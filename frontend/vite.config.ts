import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the API runs separately (uvicorn on port 8000); Vite forwards /api to it.
const api = { '/api': 'http://127.0.0.1:8000' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    // Older syntax than Vite's default so Smart TV browsers (often an older Chromium) can run it.
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
  },
})
