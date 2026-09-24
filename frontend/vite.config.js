import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发期把 /api 代理到 Spring Boot；打包产物输出到后端 static 目录，实现单 jar 交付
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
})
