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

const app = createApp(App);

document.documentElement.dataset.client = 'desktop';

app.use(createPinia());
app.use(router);

app.mount('#app');
