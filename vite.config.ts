import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from a subpath on GitHub Pages (zorlack.github.io/chattercat/),
  // but from root during local dev.
  base: command === 'build' ? '/chattercat/' : '/',
  plugins: [react()],
  server: {
    // getUserMedia() requires a secure context. localhost counts as secure,
    // but set host so you can also reach the dev server from other devices
    // over HTTPS if needed later.
    host: true,
  },
}))
