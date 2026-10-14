import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 개발할 때(npm run dev) /api 요청을 FastAPI 서버로 넘깁니다. 서버에 CORS를 켜지 않기 위해서입니다. (API-SPEC.md 3절)
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
