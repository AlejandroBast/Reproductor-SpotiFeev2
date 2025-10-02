import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Reproductor-SpotiFeev2/',   // 👈 cambia "TU-REPO" por el nombre exacto de tu repo en GitHub
})
