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
    open: true,
    watch: { ignored: ['**/release/**', '**/.temp/**'] }
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](echarts|zrender)[\\/]/.test(id)) return 'charts';
          if (/[\\/]node_modules[\\/]animejs[\\/]/.test(id)) return 'motion';
          if (/[\\/]node_modules[\\/](@vue|vue|vue-router|pinia|axios)[\\/]/.test(id))
            return 'vendor';
        }
      }
    }
  }
});
