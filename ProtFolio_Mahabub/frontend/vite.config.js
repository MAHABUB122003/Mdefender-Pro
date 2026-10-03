import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mdefenderVite } from 'mdefender-pro/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mdefenderVite({
      apiKey: 'qRk5Mk5v3SA5hWU22rVk_hZuQ735ps9D1AjBFuAC6C8hD8rRdxhAhe5SEml125L1',
      domain: 'mahabubur.vercel.app',
      apiEndpoint: 'http://127.0.0.1:8000',
      mode: 'block'
    }),
    tailwindcss(),
    react()
  ],
})

