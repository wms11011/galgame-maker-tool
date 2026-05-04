import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        // Monaco Editor ESM 路径别名
        'monaco-editor': resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.api')
      }
    },
    plugins: [vue()],
    // Monaco Editor worker 配置
    worker: {
      format: 'es'
    }
  }
})
