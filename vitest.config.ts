import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup-canvas.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/renderer/src/**/*.ts', 'src/main/services/*.ts'],
      exclude: ['src/renderer/src/types/index.ts', 'src/**/*.test.*', 'src/**/*.vue']
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      'monaco-editor': resolve(__dirname, 'src/tests/__mocks__/monaco-editor.ts')
    }
  }
})
