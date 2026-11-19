import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server forwards /api to the backend, so the browser sees a single origin: the refresh
// cookie (SameSite=Strict, path /api/auth) is sent and no CORS is needed. The target is 127.0.0.1,
// not localhost: uvicorn listens on IPv4 only, and Node may resolve localhost to ::1 first.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
    },
  },
});
