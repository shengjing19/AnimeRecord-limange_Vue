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
import '@/utils/flexible.js'; // 导入移动端适配脚本

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
