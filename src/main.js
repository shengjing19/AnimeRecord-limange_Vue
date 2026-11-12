/**
 * limange - main.js
 * Vue 3 应用入口文件
 * 初始化 Pinia、Vue Router，挂载根组件
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import '@/assets/styles/global.css';
import '@/assets/styles/desktop.css';

const app = createApp(App);

document.documentElement.dataset.client = 'desktop';

app.use(createPinia());
app.use(router);

// 桌面配置由主进程持久化，在发出第一个 API 请求前同步到渲染层。
async function bootstrap() {
  if (window.limangeDesktop) {
    localStorage.setItem('app_server_url', await window.limangeDesktop.getServerUrl());
  }
  app.mount('#app');
}

bootstrap();
