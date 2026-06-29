/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Explicit per project-standards § Performance (PE-*): surface oversized chunks early.
    // Content-hashed filenames are left at Vite's default (do not override).
    chunkSizeWarningLimit: 600,
  },
  test: {
    // Vitest test environment — jsdom for component mounting via @vue/test-utils.
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
})
