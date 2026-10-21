/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: true, // permite abrir el panel desde un celular conectado a la misma red wifi
      // El panel llama a /api/...; Vite lo reenvía a la API. Así no hace falta CORS en desarrollo.
      proxy: {
        '/api': {
          target: env.API_DESTINO || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (ruta) => ruta.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/preparar.ts',
      // Las pruebas de pantalla completa en jsdom pasan los 5 s por defecto al correr todas juntas en Windows
      testTimeout: 15_000,
    },
  }
})
