import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server port and the API it proxies come from client/.env (VITE_PORT, VITE_API_URL),
 * so the same configuration runs locally and on a build machine. See client/.env.example.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || `http://localhost:${env.PORT || 5000}`;
  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT) || 3003,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
