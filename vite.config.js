import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import pxtorem from 'postcss-pxtorem';

export default defineConfig({
  plugins: [vue()],

  css: {
    postcss: {
      plugins: [
        pxtorem({
          rootValue: 16,
          propList: ['*'],
          selectorBlackList: [],
          replace: true,
          mediaQuery: true,
          minPixelValue: 1
        })
      ]
    }
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    port: 3000,
    open: true
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts'],
          animejs: ['animejs'],
          vendor: ['vue', 'vue-router', 'pinia', 'axios']
        }
      }
    }
  }
});
