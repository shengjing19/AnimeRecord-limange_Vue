import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import pxtorem from 'postcss-pxtorem';

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        pxtorem({
          rootValue: 16, // 对应 flexible.js 中的 baseFontSize
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
      '@': resolve(__dirname, 'src')
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
          'echarts': ['echarts'],
          'animejs': ['animejs'],
          'vendor': ['vue', 'vue-router', 'pinia', 'axios']
        }
      }
    }
  }
});
