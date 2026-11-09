import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Play-Earn/', // আপনার গিটহাব রিপো নেম
})
